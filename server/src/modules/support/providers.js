const mongoose = require('mongoose');
const Complaint = require('./models/Complaint');
const ComplaintHistory = require('./models/ComplaintHistory');
const Faq = require('./models/Faq');

/** True when `Model` is either an in-memory test mock (no `.db`) or connected to a live MongoDB. */
const canQuery = (Model) => !Model.db || Model.db.readyState === 1;

/**
 * Global search contract: searches FAQ articles ONLY.
 * Never exposes private complaints or anonymous help-box questions.
 */
async function searchProvider(q, { limit = 10 } = {}) {
  if (!canQuery(Faq)) return [];
  const safe = String(q || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!safe) return [];
  const articles = await Faq.find({
    hidden: { $ne: true },
    $or: [
      { title: { $regex: safe, $options: 'i' } },
      { body: { $regex: safe, $options: 'i' } },
      { tags: { $regex: safe, $options: 'i' } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return articles.map((a) => ({
    id: String(a._id),
    title: a.title,
    snippet: `FAQ · ${a.category} — ${String(a.body || '').slice(0, 120)}`,
    type: 'faq',
    url: `/faq/${a._id}`,
  }));
}

/**
 * Summary contract:
 * - For a user (`userId` given): returns that user's complaints count + recent links.
 * - Platform-wide (`scope === 'all'` or `!userId`): computes resolution rate (% moved past 'submitted' within 7 days).
 */
async function summaryProvider(userId, opts = {}) {
  if (opts?.scope === 'all' || !userId) {
    if (!canQuery(Complaint)) return { stat: { label: 'Complaints Progressed (7d %)', value: 0 }, recent: [] };
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [totalRecent, movedRecent] = await Promise.all([
      Complaint.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Complaint.countDocuments({ createdAt: { $gte: sevenDaysAgo }, status: { $ne: 'submitted' } }),
    ]);
    const pct = totalRecent > 0 ? Math.round((movedRecent / totalRecent) * 100) : 100;
    return {
      stat: { label: 'Complaints Progressed (7d %)', value: pct },
      recent: [],
    };
  }

  if (!canQuery(Complaint)) return { stat: { label: 'My Complaints', value: 0 }, recent: [] };
  const [count, mine] = await Promise.all([
    Complaint.countDocuments({ ownerId: userId }),
    Complaint.find({ ownerId: userId }).sort({ createdAt: -1 }).limit(3).lean(),
  ]);

  return {
    stat: { label: 'My Complaints', value: count },
    recent: mine.map((c) => ({
      text: `Complaint "${c.title}" (${c.status.replace('_', ' ')})`,
      url: `/complaints/${c._id}`,
      at: c.createdAt,
    })),
  };
}

const moderationHooks = {
  targetTypes: ['faq', 'support'],
  async hide(id) {
    if (!canQuery(Faq) || !mongoose.isValidObjectId(id)) return false;
    const updated = await Faq.findByIdAndUpdate(id, { $set: { hidden: true, hiddenAt: new Date() } });
    return Boolean(updated);
  },
  async restore(id) {
    if (!canQuery(Faq) || !mongoose.isValidObjectId(id)) return false;
    const updated = await Faq.findByIdAndUpdate(id, { $set: { hidden: false, hiddenAt: null } });
    return Boolean(updated);
  },
};

/** Deletes user-owned complaints & history. HelpBox has no userId, so it is untouched. */
async function deleteUserData(userId) {
  if (!userId || !canQuery(Complaint)) return { deleted: 0 };
  const owned = await Complaint.find({ ownerId: String(userId) }).select('_id').lean();
  const ids = owned.map((c) => c._id);
  await ComplaintHistory.deleteMany({ complaintId: { $in: ids } });
  const res = await Complaint.deleteMany({ ownerId: String(userId) });
  return { deleted: res.deletedCount || 0 };
}

module.exports = { searchProvider, summaryProvider, moderationHooks, deleteUserData };
