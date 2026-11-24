/** Validation for the Phase 2 endpoints (moderation, categories, contributions, campaign updates). */
const { HttpError } = require('../../core/errors');

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const fail = (details) => new HttpError(400, Object.values(details)[0], details);

const validateNote = (body = {}) => ({ note: str(body.note).slice(0, 500) });

/** Warn needs a reason so the user and the audit log both say why. */
function validateReason(body = {}) {
  const note = str(body.reason ?? body.note).slice(0, 500);
  if (note.length < 3) throw fail({ reason: 'Give a short reason (at least 3 characters)' });
  return { note };
}

function validateCategory(body = {}, { partial = false } = {}) {
  const out = {};
  const errors = {};
  if (!partial || body.scope !== undefined) {
    out.scope = str(body.scope).toLowerCase();
    if (!/^[a-z0-9_-]{2,40}$/.test(out.scope)) errors.scope = 'Choose which module this category belongs to';
  }
  if (!partial || body.name !== undefined) {
    out.name = str(body.name);
    if (out.name.length < 2 || out.name.length > 60) errors.name = 'Name must be 2 to 60 characters';
  }
  if (body.order !== undefined) {
    out.order = Number(body.order);
    if (!Number.isFinite(out.order)) errors.order = 'Order must be a number';
  }
  if (body.active !== undefined) {
    if (typeof body.active !== 'boolean') errors.active = 'Invalid value';
    else out.active = body.active;
  }
  if (Object.keys(errors).length) throw fail(errors);
  return out;
}

function validateContribution(body = {}) {
  const amount = Number(body.amount);
  const errors = {};
  if (!Number.isFinite(amount) || amount < 1) errors.amount = 'Amount must be at least PKR 1';
  if (amount > 100000000) errors.amount = 'Amount is too large';
  if (Object.keys(errors).length) throw fail(errors);
  return {
    amount: Math.round(amount),
    donorName: str(body.donorName).slice(0, 80),
    anonymous: body.anonymous === true,
    note: str(body.note).slice(0, 200),
  };
}

function validateUpdate(body = {}) {
  const text = str(body.text);
  if (text.length < 3 || text.length > 500) throw fail({ text: 'Update must be 3 to 500 characters' });
  return { text };
}

module.exports = { validateNote, validateReason, validateCategory, validateContribution, validateUpdate };
