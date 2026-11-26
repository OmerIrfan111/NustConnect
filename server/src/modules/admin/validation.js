const { HttpError } = require('../../core/errors');

const REASONS = ['spam', 'abuse', 'inappropriate', 'misleading', 'other'];
const CAMPAIGN_STATUSES = ['draft', 'active', 'closed'];

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const fail = (details) => new HttpError(400, Object.values(details)[0], details);

/** POST /reports body. `targetType` + `targetId` come from <ReportButton targetType targetId />. */
function validateReport(body = {}) {
  const data = {
    targetType: str(body.targetType).toLowerCase(),
    targetId: str(body.targetId),
    reason: REASONS.includes(body.reason) ? body.reason : 'other',
    details: str(body.details).slice(0, 500),
  };
  const errors = {};
  if (!/^[a-z0-9_-]{1,40}$/.test(data.targetType)) errors.targetType = 'targetType is required';
  if (!data.targetId || data.targetId.length > 100) errors.targetId = 'targetId is required';
  if (Object.keys(errors).length) throw fail(errors);
  return data;
}

/** Campaign create / update body. `partial` (PUT) only validates the fields that are present. */
function validateCampaign(body = {}, { partial = false } = {}) {
  const out = {};
  const errors = {};
  const has = (k) => body[k] !== undefined;

  if (!partial || has('title')) {
    out.title = str(body.title);
    if (out.title.length < 3 || out.title.length > 120) errors.title = 'Title must be 3 to 120 characters';
  }
  if (!partial || has('description')) out.description = str(body.description).slice(0, 2000);
  if (!partial || has('goalAmount')) {
    out.goalAmount = Number(body.goalAmount);
    if (!Number.isFinite(out.goalAmount) || out.goalAmount < 1) errors.goalAmount = 'Goal must be a positive amount';
  }
  if (has('status')) {
    if (!CAMPAIGN_STATUSES.includes(body.status)) errors.status = 'Invalid status';
    else out.status = body.status;
  }
  if (has('deadline')) {
    if (!body.deadline) out.deadline = null;
    else if (Number.isNaN(new Date(body.deadline).getTime())) errors.deadline = 'Invalid deadline';
    else out.deadline = new Date(body.deadline);
  }
  if (Object.keys(errors).length) throw fail(errors);
  return out;
}

module.exports = { validateReport, validateCampaign };
