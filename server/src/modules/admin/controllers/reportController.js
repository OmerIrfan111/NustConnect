const Report = require('../models/Report');
const { REASONS } = Report;
const { validateReport } = require('../validation');

/** POST /reports (any signed-in user). Reporting the same target twice returns the existing open report. */
async function create(req, res) {
  const data = validateReport(req.body);
  const existing = await Report.findOne({
    targetType: data.targetType,
    targetId: data.targetId,
    reporterId: req.user.id,
    status: 'open',
  });
  if (existing) return res.status(202).json({ accepted: true, id: String(existing._id), duplicate: true });

  const report = await Report.create({ ...data, reporterId: req.user.id });
  res.status(202).json({ accepted: true, id: String(report._id) });
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * GET /reports?status=open|resolved|dismissed|all&reason=&type=&q=&page&limit (moderators and admins).
 * `q` searches the content type, content id and the reporter's details text. The reporter's identity is never returned.
 */
async function list(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const query = {};
  if (['open', 'resolved', 'dismissed'].includes(req.query.status)) query.status = req.query.status;
  else if (req.query.status !== 'all') query.status = 'open';
  if (typeof req.query.reason === 'string' && REASONS.includes(req.query.reason)) query.reason = req.query.reason;
  if (typeof req.query.type === 'string' && /^[a-z0-9_-]{1,40}$/i.test(req.query.type)) query.targetType = req.query.type.toLowerCase();
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    query.$or = [{ targetId: rx }, { targetType: rx }, { details: rx }];
  }

  const [items, total] = await Promise.all([
    Report.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Report.countDocuments(query),
  ]);
  res.json({ items: items.map((r) => r.toPublic()), total, page, limit });
}

module.exports = { create, list };
