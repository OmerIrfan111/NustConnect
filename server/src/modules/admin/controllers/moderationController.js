const mongoose = require('mongoose');
const Report = require('../models/Report');
const { HttpError } = require('../../../core/errors');
const { hookFor, userModeration } = require('../moderation');
const { validateNote, validateReason } = require('../validation2');
const audit = require('../audit');

const registryOf = (req) => req.app.locals.modules || new Map();

async function loadReport(id) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'Report not found');
  const report = await Report.findById(id);
  if (!report) throw new HttpError(404, 'Report not found');
  return report;
}

async function finish(req, report, { status, action, note, auditAction }) {
  report.status = status;
  report.action = action;
  report.note = note;
  report.handledBy = req.user.id;
  report.handledAt = new Date();
  await report.save();
  await audit.record(req.user, auditAction, { targetType: report.targetType, targetId: report.targetId, reportId: report._id, note });
  return report.toPublic();
}

/** POST /reports/:id/hide: the owning module hides the content (students stop seeing it, moderators still do). */
async function hide(req, res) {
  const { note } = validateNote(req.body);
  const report = await loadReport(req.params.id);
  if (report.action === 'hidden') throw new HttpError(409, 'This content is already hidden');

  const hook = hookFor(registryOf(req), report.targetType, 'hide');
  if (!hook) throw new HttpError(409, `No module can hide "${report.targetType}" content yet`);
  try {
    await hook.run(report.targetId);
  } catch (err) {
    throw new HttpError(502, `The ${hook.slug} module could not hide this item`);
  }
  res.json({ report: await finish(req, report, { status: 'resolved', action: 'hidden', note, auditAction: 'report.hide' }) });
}

/** POST /reports/:id/restore: reverses a hide. */
async function restore(req, res) {
  const { note } = validateNote(req.body);
  const report = await loadReport(req.params.id);
  if (report.action !== 'hidden') throw new HttpError(409, 'Only hidden content can be restored');

  const hook = hookFor(registryOf(req), report.targetType, 'restore');
  if (!hook) throw new HttpError(409, `No module can restore "${report.targetType}" content yet`);
  try {
    await hook.run(report.targetId);
  } catch (err) {
    throw new HttpError(502, `The ${hook.slug} module could not restore this item`);
  }
  res.json({ report: await finish(req, report, { status: 'resolved', action: 'restored', note, auditAction: 'report.restore' }) });
}

/** POST /reports/:id/dismiss: no action needed on the content. */
async function dismiss(req, res) {
  const { note } = validateNote(req.body);
  const report = await loadReport(req.params.id);
  if (report.status !== 'open') throw new HttpError(409, 'This report was already handled');
  res.json({ report: await finish(req, report, { status: 'dismissed', action: 'none', note, auditAction: 'report.dismiss' }) });
}

/** POST /users/:id/(warn|suspend|unsuspend): goes through the auth module's `userModeration` contract. */
const userAction = (name, auditAction) => async (req, res) => {
  const { note } = name === 'unsuspend' ? validateNote(req.body) : validateReason(req.body);
  const userId = String(req.params.id);
  if (userId === String(req.user.id)) throw new HttpError(400, 'You cannot do this to your own account');

  const mod = userModeration(registryOf(req));
  if (!mod || typeof mod[name] !== 'function') throw new HttpError(409, 'Account moderation is not available yet');
  const result = await mod[name](userId, note);
  if (result === false || result === null) throw new HttpError(404, 'User not found');

  await audit.record(req.user, auditAction, { targetType: 'user', targetId: userId, note });
  res.json({ ok: true, action: name });
};

module.exports = {
  hide,
  restore,
  dismiss,
  warn: userAction('warn', 'user.warn'),
  suspend: userAction('suspend', 'user.suspend'),
  unsuspend: userAction('unsuspend', 'user.unsuspend'),
};
