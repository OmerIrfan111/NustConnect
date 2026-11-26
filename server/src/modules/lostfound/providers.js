const mongoose = require('mongoose');
const Item = require('./models/Item');
const Claim = require('./models/Claim');

/** True when `Model` is either an in-memory test mock (no `.db`) or connected to a live MongoDB. */
const canQuery = (Model) => !Model.db || Model.db.readyState === 1;

async function searchProvider(q, { limit = 10 } = {}) {
  if (!canQuery(Item)) return [];
  const safe = String(q || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!safe) return [];
  const rows = await Item.find({
    hidden: { $ne: true },
    expiresAt: { $gt: new Date() },
    $or: [
      { title: { $regex: safe, $options: 'i' } },
      { description: { $regex: safe, $options: 'i' } },
      { location: { $regex: safe, $options: 'i' } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return rows.map((r) => ({
    id: String(r._id),
    title: `${r.type === 'found' ? '[Found]' : '[Lost]'} ${r.title}`,
    snippet: `${r.location} · ${r.status}`,
    type: 'lostfound',
    url: `/lost-found/${r._id}`,
  }));
}

async function summaryProvider(userId, opts = {}) {
  if (opts?.scope === 'all' || !userId) {
    if (!canQuery(Item)) return { stat: { label: 'Lost & Found Items', value: 0 }, recent: [] };
    const count = await Item.countDocuments({ hidden: { $ne: true }, status: 'open', expiresAt: { $gt: new Date() } });
    return { stat: { label: 'Lost & Found Items', value: count }, recent: [] };
  }

  if (!canQuery(Item)) return { stat: { label: 'Lost & Found Posts', value: 0 }, recent: [] };
  const [count, mine] = await Promise.all([
    Item.countDocuments({ ownerId: userId, hidden: { $ne: true } }),
    Item.find({ ownerId: userId, hidden: { $ne: true } }).sort({ createdAt: -1 }).limit(3).lean(),
  ]);

  return {
    stat: { label: 'Lost & Found Posts', value: count },
    recent: mine.map((r) => ({
      text: `${r.type === 'found' ? 'Found' : 'Lost'}: ${r.title} (${r.status})`,
      url: `/lost-found/${r._id}`,
      at: r.createdAt,
    })),
  };
}

const moderationHooks = {
  targetTypes: ['lostitem', 'founditem', 'lostfound'],
  async hide(id) {
    if (!canQuery(Item) || !mongoose.isValidObjectId(id)) return false;
    const res = await Item.findByIdAndUpdate(id, { $set: { hidden: true, hiddenAt: new Date() } });
    return Boolean(res);
  },
  async restore(id) {
    if (!canQuery(Item) || !mongoose.isValidObjectId(id)) return false;
    const res = await Item.findByIdAndUpdate(id, { $set: { hidden: false, hiddenAt: null } });
    return Boolean(res);
  },
};

async function deleteUserData(userId) {
  if (!userId || !canQuery(Item)) return { deleted: 0 };
  const owned = await Item.find({ ownerId: String(userId) }).select('_id').lean();
  const itemIds = owned.map((i) => i._id);
  await Claim.deleteMany({ $or: [{ claimantId: String(userId) }, { itemId: { $in: itemIds } }] });
  const res = await Item.deleteMany({ ownerId: String(userId) });
  return { deleted: res.deletedCount || 0 };
}

module.exports = { searchProvider, summaryProvider, moderationHooks, deleteUserData };
