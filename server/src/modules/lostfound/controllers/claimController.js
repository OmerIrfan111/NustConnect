const mongoose = require('mongoose');
const { HttpError } = require('../../../core/errors');
const Item = require('../models/Item');
const Claim = require('../models/Claim');
const { validateCreateClaim, validateClaimDecision } = require('../validation');
const { notifyUser } = require('../notifyHelper');

async function createClaim(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Item not found');
  const item = await Item.findById(req.params.id);
  if (!item || item.hidden) throw new HttpError(404, 'Item not found');
  if (item.ownerId === req.user.id) throw new HttpError(400, 'You cannot claim your own post');
  if (item.status !== 'open') throw new HttpError(409, `This item is already ${item.status}`);

  const { message } = validateCreateClaim(req.body);
  const existing = await Claim.findOne({ itemId: item._id, claimantId: req.user.id, status: 'pending' });
  if (existing) throw new HttpError(409, 'You already have a pending claim on this item');

  const claim = await Claim.create({
    itemId: item._id,
    claimantId: req.user.id,
    claimantName: req.user.name,
    claimantVerified: Boolean(req.user.verified),
    message,
  });

  await notifyUser(item.ownerId, {
    type: 'lostfound',
    title: 'New claim request',
    body: `${req.user.name} submitted a claim on "${item.title}".`,
    link: `/lost-found/${item._id}`,
    important: true,
  });

  res.status(201).json({ claim: claim.toPublic() });
}

async function decideClaim(req, res) {
  if (!mongoose.isValidObjectId(req.params.claimId)) throw new HttpError(404, 'Claim not found');
  const claim = await Claim.findById(req.params.claimId);
  if (!claim) throw new HttpError(404, 'Claim not found');

  const item = await Item.findById(claim.itemId);
  if (!item) throw new HttpError(404, 'Item not found');

  const { action, decisionNote } = validateClaimDecision(req.body);

  if (action === 'cancelled') {
    if (claim.claimantId !== req.user.id) throw new HttpError(403, 'Only the claimant can cancel this claim');
    if (claim.status !== 'pending') throw new HttpError(409, 'Only pending claims can be cancelled');
    claim.status = 'cancelled';
    claim.decidedAt = new Date();
    await claim.save();
    return res.json({ claim: claim.toPublic(), item: item.toPublic() });
  }

  if (item.ownerId !== req.user.id) {
    throw new HttpError(403, 'Only the item owner can approve or reject claims');
  }
  if (claim.status !== 'pending') throw new HttpError(409, 'This claim has already been reviewed');

  claim.status = action;
  claim.decisionNote = decisionNote;
  claim.decidedAt = new Date();
  await claim.save();

  if (action === 'approved') {
    item.status = 'claimed';
    await item.save();
    await Claim.updateMany(
      { itemId: item._id, _id: { $ne: claim._id }, status: 'pending' },
      { $set: { status: 'rejected', decisionNote: 'Another claim was approved', decidedAt: new Date() } },
    );
  }

  await notifyUser(claim.claimantId, {
    type: 'lostfound',
    title: action === 'approved' ? 'Your claim was approved' : 'Your claim was declined',
    body: `Your claim on "${item.title}" was ${action}.`,
    link: `/lost-found/${item._id}`,
    important: action === 'approved',
  });

  res.json({ claim: claim.toPublic(), item: item.toPublic() });
}

module.exports = { createClaim, decideClaim };
