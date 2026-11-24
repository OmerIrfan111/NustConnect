const Report = require('../models/Report');
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

/** GET /reports?status=open|resolved|dismissed|all&page&limit (moderators and admins) */
async function list(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const query = {};
  if (['open', 'resolved', 'dismissed'].includes(req.query.status)) query.status = req.query.status;
  else if (req.query.status !== 'all') query.status = 'open';

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
