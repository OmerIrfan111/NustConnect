const Audit = require('../models/AuditEntry');

/** GET /audit?action=&page=&limit= (admin): newest first. Entries are never edited or deleted through the API. */
async function list(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
  const query = {};
  if (typeof req.query.action === 'string' && /^[a-z.-]{1,60}$/.test(req.query.action)) query.action = req.query.action;

  const [items, total] = await Promise.all([
    Audit.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Audit.countDocuments(query),
  ]);
  res.json({ items: items.map((a) => a.toPublic()), total, page, limit });
}

module.exports = { list };
