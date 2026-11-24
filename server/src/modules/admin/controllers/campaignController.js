const mongoose = require('mongoose');
const Campaign = require('../models/Campaign');
const { HttpError } = require('../../../core/errors');
const { validateCampaign } = require('../validation');

const isAdmin = (user) => user.role === 'admin';

/** GET /campaigns. Students see active + closed. Admins also see drafts. */
async function list(req, res) {
  const query = isAdmin(req.user) ? {} : { status: { $ne: 'draft' } };
  const items = await Campaign.find(query).sort({ createdAt: -1 }).limit(100);
  res.json({ items: items.map((c) => c.toPublic()) });
}

async function get(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'Campaign not found');
  const c = await Campaign.findById(id);
  // Drafts are visible to admins only. Everyone else gets a 404, not a 403.
  if (!c || (c.status === 'draft' && !isAdmin(req.user))) throw new HttpError(404, 'Campaign not found');
  res.json({ campaign: c.toPublic() });
}

async function create(req, res) {
  const data = validateCampaign(req.body);
  const c = await Campaign.create({ ...data, createdBy: req.user.id });
  res.status(201).json({ campaign: c.toPublic() });
}

async function update(req, res) {
  const data = validateCampaign(req.body, { partial: true });
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Campaign not found');
  const c = await Campaign.findByIdAndUpdate(req.params.id, data, { returnDocument: 'after', runValidators: true });
  if (!c) throw new HttpError(404, 'Campaign not found');
  res.json({ campaign: c.toPublic() });
}

module.exports = { list, get, create, update };
