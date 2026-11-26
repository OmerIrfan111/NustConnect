const mongoose = require('mongoose');
const { HttpError } = require('../../../core/errors');
const Bill = require('../models/Bill');
const { toCents, computeSplits, buildSettlementSummary } = require('../billMath');
const { notifyUser } = require('../notifyHelper');

const MAX_PARTICIPANTS = 20;
const MAX_TOTAL_CENTS = 1_000_000_000; // PKR 10,000,000
const isStaff = (user) => user && (user.role === 'moderator' || user.role === 'admin');
const clean = (v, max) => String(v ?? '').trim().slice(0, max);
const pkr = (cents) => `PKR ${(cents / 100).toLocaleString('en-PK', { minimumFractionDigits: cents % 100 ? 2 : 0 })}`;

function parseDue(value) {
  if (value === undefined || value === null || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new HttpError(400, 'Due date is invalid', { dueDate: 'Due date is invalid' });
  return d;
}

/** The creator is always a participant, and their name/verified flag come from the session, never from the request. */
function withCreator(user, participants) {
  const list = (Array.isArray(participants) ? participants : []).slice(0, MAX_PARTICIPANTS).map((p) => ({ ...p }));
  const me = list.find((p) => String(p?.userId ?? p?.id) === user.id);
  if (me) Object.assign(me, { userId: user.id, name: user.name, verified: Boolean(user.verified) });
  else list.unshift({ userId: user.id, name: user.name, verified: Boolean(user.verified) });
  return list;
}

/** The person who paid the bill has already covered their own share. */
function creatorPaid(participants, creatorId) {
  return participants.map((p) =>
    p.userId === creatorId ? { ...p, paidCents: p.owedCents, settledAt: p.settledAt || new Date() } : p,
  );
}

const allPaid = (participants) => participants.every((p) => (p.paidCents || 0) >= p.owedCents);

function buildFromBody(user, body, existing) {
  const title = clean(body.title ?? existing?.title, 140);
  if (title.length < 2) throw new HttpError(400, 'Title must be at least 2 characters', { title: 'Title must be at least 2 characters' });

  const totalCents = body.total !== undefined || body.totalAmount !== undefined ? toCents(body.total ?? body.totalAmount) : existing?.totalCents;
  if (!Number.isInteger(totalCents) || totalCents <= 0 || totalCents > MAX_TOTAL_CENTS) {
    throw new HttpError(400, 'Enter a total between PKR 0.01 and PKR 10,000,000', { total: 'Enter a valid total amount' });
  }

  const splitMethod = clean(body.splitMethod ?? existing?.splitMethod ?? 'equal', 10).toLowerCase();
  const split = computeSplits({
    totalCents,
    splitMethod,
    participants: withCreator(user, body.participants ?? existing?.participants),
    items: body.items ?? existing?.items,
  });
  return { title, totalCents, splitMethod, participants: creatorPaid(split.participants, user.id), items: split.items };
}

/** Only participants may see a bill. A hidden (moderated) bill is visible to staff only. */
async function loadVisible(req) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Bill not found');
  const bill = await Bill.findById(req.params.id);
  if (!bill) throw new HttpError(404, 'Bill not found');
  const member = bill.creatorId === req.user.id || bill.participants.some((p) => p.userId === req.user.id);
  if (bill.hidden) {
    if (!isStaff(req.user)) throw new HttpError(404, 'Bill not found');
  } else if (!member) {
    throw new HttpError(403, 'Only people on this bill can view it');
  }
  return bill;
}

const detail = (bill, user) => ({
  bill: bill.toPublic(),
  settlement: buildSettlementSummary(bill),
  isCreator: bill.creatorId === user.id,
});

async function listBills(req, res) {
  const filter = { hidden: { $ne: true }, $or: [{ creatorId: req.user.id }, { 'participants.userId': req.user.id }] };
  if (req.query.status === 'open' || req.query.status === 'settled') filter.status = req.query.status;
  const rows = await Bill.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json({ bills: rows.map((b) => b.toPublic()) });
}

async function createBill(req, res) {
  const body = req.body || {};
  const built = buildFromBody(req.user, body);
  const bill = await Bill.create({
    ...built,
    description: clean(body.description, 500),
    dueDate: parseDue(body.dueDate),
    creatorId: req.user.id,
    creatorName: req.user.name,
    status: allPaid(built.participants) ? 'settled' : 'open',
  });

  await Promise.all(
    bill.participants
      .filter((p) => p.userId !== req.user.id)
      .map((p) =>
        notifyUser(p.userId, {
          type: 'bill',
          title: 'You were added to a bill',
          body: `${req.user.name} added you to "${bill.title}". Your share is ${pkr(p.owedCents)}.`,
          link: `/bills/${bill._id}`,
          important: true,
        }),
      ),
  );

  res.status(201).json(detail(bill, req.user));
}

async function getBill(req, res) {
  res.json(detail(await loadVisible(req), req.user));
}

/** PATCH: only the creator edits. Amounts/people can only change while no payment has been recorded. */
async function updateBill(req, res) {
  const bill = await loadVisible(req);
  if (bill.creatorId !== req.user.id) throw new HttpError(403, 'Only the bill creator can edit it');
  const body = req.body || {};

  if (body.description !== undefined) bill.description = clean(body.description, 500);
  if (body.dueDate !== undefined) {
    bill.dueDate = parseDue(body.dueDate);
    bill.reminderSentAt = null;
  }

  const changesSplit = ['total', 'totalAmount', 'splitMethod', 'participants', 'items'].some((k) => body[k] !== undefined);
  if (changesSplit) {
    const hasPayments = bill.payments.length > 0 || bill.participants.some((p) => p.userId !== bill.creatorId && p.paidCents > 0);
    if (hasPayments) throw new HttpError(409, 'Amounts and participants cannot change after a payment was recorded');
    const built = buildFromBody(req.user, body, bill);
    Object.assign(bill, built, { status: allPaid(built.participants) ? 'settled' : 'open' });
  } else if (body.title !== undefined) {
    const title = clean(body.title, 140);
    if (title.length < 2) throw new HttpError(400, 'Title must be at least 2 characters', { title: 'Title must be at least 2 characters' });
    bill.title = title;
  }

  await bill.save();
  res.json(detail(bill, req.user));
}

async function deleteBill(req, res) {
  const bill = await loadVisible(req);
  if (bill.creatorId !== req.user.id) throw new HttpError(403, 'Only the bill creator can delete it');
  await Bill.deleteOne({ _id: bill._id });
  res.json({ ok: true });
}

/** POST /bills/:id/payments: the creator records any payment; a participant records their own. Never more than the balance. */
async function recordPayment(req, res) {
  const bill = await loadVisible(req);
  const body = req.body || {};
  const targetId = clean(body.userId || req.user.id, 120);
  const isCreator = bill.creatorId === req.user.id;
  if (!isCreator && targetId !== req.user.id) throw new HttpError(403, 'You can only record your own payment');

  const person = bill.participants.find((p) => p.userId === targetId);
  if (!person) throw new HttpError(404, 'That person is not on this bill');

  const amountCents = toCents(body.amount);
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new HttpError(400, 'Enter a payment amount greater than zero', { amount: 'Enter a payment amount greater than zero' });
  }
  const balance = person.owedCents - (person.paidCents || 0);
  if (amountCents > balance) {
    throw new HttpError(400, `That is more than the remaining balance (${pkr(balance)})`, { amount: `Remaining balance is ${pkr(balance)}` });
  }

  person.paidCents = (person.paidCents || 0) + amountCents;
  if (person.paidCents >= person.owedCents) person.settledAt = new Date();
  bill.payments.push({
    userId: person.userId,
    userName: person.name,
    amountCents,
    note: clean(body.note, 200),
    recordedBy: req.user.id,
    recordedAt: new Date(),
  });
  bill.status = allPaid(bill.participants) ? 'settled' : 'open';
  await bill.save();

  const notifyId = person.userId === bill.creatorId || person.userId === req.user.id ? bill.creatorId : person.userId;
  if (notifyId !== req.user.id) {
    await notifyUser(notifyId, {
      type: 'bill',
      title: 'Payment recorded',
      body: `${pkr(amountCents)} from ${person.name} was recorded on "${bill.title}".`,
      link: `/bills/${bill._id}`,
    });
  }
  res.json(detail(bill, req.user));
}

/**
 * Deadline reminders: notifies every participant who still owes money on a bill due within 24 hours (or overdue), once per
 * due date. Meant for a daily job; exposed to admins as POST /bills/reminders/run.
 */
async function sendDueReminders(now = new Date()) {
  const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const rows = await Bill.find({ status: 'open', hidden: { $ne: true } }).limit(500);
  let reminded = 0;
  for (const bill of rows) {
    if (!bill.dueDate || bill.reminderSentAt || new Date(bill.dueDate) > horizon) continue;
    const owing = bill.participants.filter((p) => p.userId !== bill.creatorId && p.owedCents > (p.paidCents || 0));
    await Promise.all(
      owing.map((p) =>
        notifyUser(p.userId, {
          type: 'bill',
          title: 'Bill payment due soon',
          body: `"${bill.title}" is due. You still owe ${pkr(p.owedCents - (p.paidCents || 0))}.`,
          link: `/bills/${bill._id}`,
          important: true,
        }),
      ),
    );
    bill.reminderSentAt = now;
    await bill.save();
    reminded += owing.length;
  }
  return { reminded };
}

async function runReminders(req, res) {
  res.json(await sendDueReminders());
}

module.exports = { listBills, createBill, getBill, updateBill, deleteBill, recordPayment, runReminders, sendDueReminders };
