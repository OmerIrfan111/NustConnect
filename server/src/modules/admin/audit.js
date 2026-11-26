const Audit = require('./models/AuditEntry');

/**
 * Writes an audit entry for an action done by `user` (req.user). Awaited by callers on purpose: if the audit entry cannot
 * be written, the request fails, so no action ever goes unrecorded.
 */
async function record(user, action, details = {}) {
  return Audit.create({
    actorId: String(user.id),
    actorName: user.name || '',
    actorRole: user.role || '',
    action,
    targetType: details.targetType || '',
    targetId: String(details.targetId ?? ''),
    reportId: String(details.reportId ?? ''),
    note: String(details.note || '').slice(0, 500),
  });
}

module.exports = { record };
