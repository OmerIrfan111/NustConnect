const { HttpError } = require('../../core/errors');

/** Convert a rupee amount (number or string) to exact integer cents/paisa. */
function toCents(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num) || num < 0) return NaN;
  return Math.round(num * 100);
}

/** Split an integer `totalCents` across `n` buckets so the sum ALWAYS equals `totalCents`. */
function divideEvenly(totalCents, n) {
  if (!Number.isInteger(totalCents) || totalCents < 0 || !Number.isInteger(n) || n <= 0) {
    throw new HttpError(400, 'Invalid split parameters');
  }
  const base = Math.floor(totalCents / n);
  const rem = totalCents % n;
  return Array.from({ length: n }, (_, idx) => base + (idx < rem ? 1 : 0));
}

/**
 * Compute and validate participant `owedCents` for `equal`, `item`, or `custom` splits.
 * Guarantees sum(participants.owedCents) === totalCents.
 */
function computeSplits({ totalCents, splitMethod, participants, items = [] }) {
  if (!Number.isInteger(totalCents) || totalCents <= 0) {
    throw new HttpError(400, 'Total amount must be greater than zero', { total: 'Total amount must be greater than zero' });
  }
  if (!Array.isArray(participants) || participants.length < 1) {
    throw new HttpError(400, 'Add at least one participant', { participants: 'Add at least one participant' });
  }

  // Deduplicate participants by userId
  const seen = new Set();
  const cleanParticipants = [];
  for (const p of participants) {
    const uid = String(p?.userId || p?.id || '').trim();
    const name = String(p?.name || '').trim().slice(0, 100);
    if (!uid || !name) throw new HttpError(400, 'Each participant needs an id and name');
    if (seen.has(uid)) throw new HttpError(400, 'Duplicate participant in bill');
    seen.add(uid);
    cleanParticipants.push({
      userId: uid,
      name,
      verified: Boolean(p?.verified),
      owedCents: 0,
      paidCents: Number.isInteger(p?.paidCents) && p.paidCents >= 0 ? p.paidCents : 0,
      settledAt: p?.settledAt || null,
      rawOwed: p?.owedAmount ?? p?.amount ?? p?.owedCents,
      isCents: p?.owedCents !== undefined && p?.owedAmount === undefined && p?.amount === undefined,
    });
  }

  let normalizedItems = [];

  if (splitMethod === 'equal') {
    const shares = divideEvenly(totalCents, cleanParticipants.length);
    cleanParticipants.forEach((p, idx) => {
      p.owedCents = shares[idx];
    });
  } else if (splitMethod === 'custom') {
    let sum = 0;
    for (const p of cleanParticipants) {
      const cents = p.isCents ? Math.round(Number(p.rawOwed)) : toCents(p.rawOwed);
      if (!Number.isInteger(cents) || cents < 0) {
        throw new HttpError(400, `Invalid custom amount for ${p.name}`, { splits: 'All custom amounts must be valid numbers' });
      }
      p.owedCents = cents;
      sum += cents;
    }
    if (sum !== totalCents) {
      throw new HttpError(
        400,
        `Custom amounts sum to ${(sum / 100).toFixed(2)} instead of ${(totalCents / 100).toFixed(2)}`,
        { splits: 'Custom amounts must sum exactly to the bill total' },
      );
    }
  } else if (splitMethod === 'item') {
    if (!Array.isArray(items) || items.length === 0) {
      throw new HttpError(400, 'Add at least one item for by-item splitting', { items: 'Add at least one item' });
    }
    const owedMap = new Map(cleanParticipants.map((p) => [p.userId, 0]));
    let itemsSum = 0;

    for (const rawItem of items) {
      const label = String(rawItem?.label || '').trim().slice(0, 120);
      const itemCents =
        rawItem?.amountCents !== undefined ? Math.round(Number(rawItem.amountCents)) : toCents(rawItem?.amount);
      if (!label) throw new HttpError(400, 'Every item needs a name');
      if (!Number.isInteger(itemCents) || itemCents <= 0) {
        throw new HttpError(400, `Item "${label}" must have a positive amount`);
      }

      const shared = [...new Set((rawItem?.sharedBy || []).map(String))].filter((uid) => owedMap.has(uid));
      if (shared.length === 0) {
        throw new HttpError(400, `Select at least one participant for "${label}"`);
      }

      const parts = divideEvenly(itemCents, shared.length);
      shared.forEach((uid, idx) => {
        owedMap.set(uid, owedMap.get(uid) + parts[idx]);
      });
      itemsSum += itemCents;
      normalizedItems.push({ label, amountCents: itemCents, sharedBy: shared });
    }

    if (itemsSum !== totalCents) {
      throw new HttpError(
        400,
        `Items sum to ${(itemsSum / 100).toFixed(2)} instead of ${(totalCents / 100).toFixed(2)}`,
        { items: 'Item totals must equal the overall bill total' },
      );
    }
    cleanParticipants.forEach((p) => {
      p.owedCents = owedMap.get(p.userId) || 0;
    });
  } else {
    throw new HttpError(400, 'Split method must be equal, item, or custom');
  }

  return {
    participants: cleanParticipants.map(({ userId, name, verified, owedCents, paidCents, settledAt }) => ({
      userId,
      name,
      verified,
      owedCents,
      paidCents: Math.min(owedCents, paidCents),
      settledAt: paidCents >= owedCents ? settledAt || new Date() : null,
    })),
    items: normalizedItems,
  };
}

/** Build a settle-up summary listing each participant's remaining balance toward the bill creator. */
function buildSettlementSummary(bill) {
  const transfers = [];
  for (const p of bill.participants || []) {
    if (p.userId === bill.creatorId) continue;
    const remainingCents = Math.max(0, (p.owedCents || 0) - (p.paidCents || 0));
    if (remainingCents > 0) {
      transfers.push({
        fromUserId: p.userId,
        fromName: p.name,
        toUserId: bill.creatorId,
        toName: bill.creatorName,
        amountCents: remainingCents,
        amount: Number((remainingCents / 100).toFixed(2)),
      });
    }
  }
  return transfers;
}

module.exports = { toCents, divideEvenly, computeSplits, buildSettlementSummary };
