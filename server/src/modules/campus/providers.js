const mongoose = require('mongoose');
const Location = require('./models/Location');
const Guide = require('./models/Guide');
const Bill = require('./models/Bill');

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const canQuery = (Model) => !Model.db || Model.db.readyState === 1;

/** Global search: campus locations and Freshie Guide articles only. Bills are private and never searchable. */
async function searchProvider(q, { limit = 10 } = {}) {
  if (!canQuery(Location) || !canQuery(Guide)) return [];
  const safe = escapeRe(String(q || '').trim());
  if (!safe) return [];
  const rx = { $regex: safe, $options: 'i' };
  const [places, guides] = await Promise.all([
    Location.find({ hidden: { $ne: true }, $or: [{ name: rx }, { description: rx }, { landmark: rx }] }).limit(limit).lean(),
    Guide.find({ hidden: { $ne: true }, $or: [{ title: rx }, { summary: rx }, { body: rx }] }).limit(limit).lean(),
  ]);
  return [
    ...places.map((p) => ({ id: String(p._id), title: p.name, snippet: `Campus map · ${p.category}`, type: 'location', url: '/map' })),
    ...guides.map((g) => ({ id: String(g._id), title: g.title, snippet: g.summary, type: 'guide', url: '/guide' })),
  ].slice(0, limit);
}

/** Per user: open bills they are on. Platform-wide (`scope: 'all'`, no user): how many bills exist. No personal data. */
async function summaryProvider(userId, opts = {}) {
  if (opts?.scope === 'all' || !userId) {
    if (!canQuery(Bill)) return { stat: { label: 'Bills Created', value: 0 }, recent: [] };
    return { stat: { label: 'Bills Created', value: await Bill.countDocuments({ hidden: { $ne: true } }) }, recent: [] };
  }
  if (!canQuery(Bill)) return { stat: { label: 'Open Bills', value: 0 }, recent: [] };
  const mine = { hidden: { $ne: true }, status: 'open', $or: [{ creatorId: userId }, { 'participants.userId': userId }] };
  const [count, recent] = await Promise.all([Bill.countDocuments(mine), Bill.find(mine).sort({ createdAt: -1 }).limit(3).lean()]);
  return {
    stat: { label: 'Open Bills', value: count },
    recent: recent.map((b) => ({ text: `Bill "${b.title}" (open)`, url: `/bills/${b._id}`, at: b.createdAt })),
  };
}

const hideFlag = (hidden) => ({ $set: { hidden, hiddenAt: hidden ? new Date() : null } });

/** A reported bill or location can be hidden by a moderator (bills then vanish for participants; staff can still open them). */
const moderationHooks = {
  targetTypes: ['bill', 'location', 'guide'],
  async hide(id) {
    if (!canQuery(Bill) || !mongoose.isValidObjectId(id)) return false;
    return Boolean((await Bill.findByIdAndUpdate(id, hideFlag(true))) || (await Location.findByIdAndUpdate(id, hideFlag(true))));
  },
  async restore(id) {
    if (!canQuery(Bill) || !mongoose.isValidObjectId(id)) return false;
    return Boolean((await Bill.findByIdAndUpdate(id, hideFlag(false))) || (await Location.findByIdAndUpdate(id, hideFlag(false))));
  },
};

/** "Delete my data": bills the user created are deleted; on other people's bills they are anonymised so the maths still adds up. */
async function deleteUserData(userId) {
  if (!userId || !canQuery(Bill)) return { deleted: 0 };
  const id = String(userId);
  const res = await Bill.deleteMany({ creatorId: id });
  await Bill.updateMany(
    { 'participants.userId': id },
    { $set: { 'participants.$[p].name': 'Deleted user', 'participants.$[p].userId': `deleted-${id.slice(-6)}` } },
    { arrayFilters: [{ 'p.userId': id }] },
  );
  return { deleted: res.deletedCount || 0 };
}

module.exports = { searchProvider, summaryProvider, moderationHooks, deleteUserData };
