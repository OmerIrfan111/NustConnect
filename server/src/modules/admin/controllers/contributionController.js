const mongoose = require('mongoose');
const Campaign = require('../models/Campaign');
const Contribution = require('../models/Contribution');
const { HttpError } = require('../../../core/errors');
const { validateContribution, validateUpdate } = require('../validation2');
const audit = require('../audit');

async function loadCampaign(id) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'Campaign not found');
  const c = await Campaign.findById(id);
  if (!c) throw new HttpError(404, 'Campaign not found');
  return c;
}

/** The campaign total is ALWAYS the sum of its contribution records, recomputed after every change. */
async function recomputeTotal(campaign) {
  const rows = await Contribution.find({ campaignId: String(campaign._id) }).lean();
  campaign.raisedAmount = rows.reduce((sum, r) => sum + r.amount, 0);
  await campaign.save();
  return campaign.raisedAmount;
}

/** GET /campaigns/:id/contributions (admin): donor names are visible here only. */
async function list(req, res) {
  const campaign = await loadCampaign(req.params.id);
  const rows = await Contribution.find({ campaignId: String(campaign._id) }).sort({ createdAt: -1 }).limit(500);
  res.json({
    items: rows.map((r) => ({ ...r.toPublic(), donorName: r.donorName || '' })),
    total: campaign.raisedAmount,
  });
}

/** POST /campaigns/:id/contributions (admin): a manual pledge record. No payment is processed. */
async function add(req, res) {
  const data = validateContribution(req.body);
  const campaign = await loadCampaign(req.params.id);
  const c = await Contribution.create({ ...data, campaignId: String(campaign._id), recordedBy: req.user.id });
  const total = await recomputeTotal(campaign);
  await audit.record(req.user, 'contribution.add', { targetType: 'campaign', targetId: campaign._id, note: `PKR ${data.amount}` });
  res.status(201).json({ contribution: c.toPublic(), campaign: campaign.toPublic(), total });
}

async function remove(req, res) {
  const campaign = await loadCampaign(req.params.id);
  if (!mongoose.isValidObjectId(req.params.contributionId)) throw new HttpError(404, 'Contribution not found');
  const gone = await Contribution.findOneAndDelete({ _id: req.params.contributionId, campaignId: String(campaign._id) });
  if (!gone) throw new HttpError(404, 'Contribution not found');
  const total = await recomputeTotal(campaign);
  await audit.record(req.user, 'contribution.delete', { targetType: 'campaign', targetId: campaign._id, note: `PKR ${gone.amount}` });
  res.json({ campaign: campaign.toPublic(), total });
}

/** POST /campaigns/:id/updates (admin): adds an entry to the campaign's updates feed. */
async function addUpdate(req, res) {
  const { text } = validateUpdate(req.body);
  const campaign = await loadCampaign(req.params.id);
  campaign.updates.push({ text, at: new Date() });
  await campaign.save();
  await audit.record(req.user, 'campaign.update-post', { targetType: 'campaign', targetId: campaign._id, note: text.slice(0, 100) });
  res.status(201).json({ campaign: campaign.toPublic() });
}

module.exports = { list, add, remove, addUpdate };
