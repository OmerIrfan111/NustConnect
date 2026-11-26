const mongoose = require('mongoose');
const { HttpError } = require('../../../core/errors');
const Faq = require('../models/Faq');
const { validateFaq } = require('../validation');

const isStaff = (user) => user && (user.role === 'moderator' || user.role === 'admin');

async function listFaq(req, res) {
  const { category, q } = req.query;
  const filter = {};
  if (!isStaff(req.user)) filter.hidden = { $ne: true };
  if (category && category !== 'all') filter.category = String(category);
  if (q && String(q).trim()) {
    const safe = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { title: { $regex: safe, $options: 'i' } },
      { body: { $regex: safe, $options: 'i' } },
      { tags: { $regex: safe, $options: 'i' } },
    ];
  }
  const rows = await Faq.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json({ articles: rows.map((a) => a.toPublic()) });
}

async function getFaq(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'FAQ article not found');
  const article = await Faq.findById(req.params.id);
  if (!article || (article.hidden && !isStaff(req.user))) throw new HttpError(404, 'FAQ article not found');
  res.json({ article: article.toPublic() });
}

async function createFaq(req, res) {
  const data = validateFaq(req.body, false);
  const article = await Faq.create(data);
  res.status(201).json({ article: article.toPublic() });
}

async function updateFaq(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'FAQ article not found');
  const article = await Faq.findById(req.params.id);
  if (!article) throw new HttpError(404, 'FAQ article not found');
  const patch = validateFaq(req.body, true);
  Object.assign(article, patch);
  await article.save();
  res.json({ article: article.toPublic() });
}

async function deleteFaq(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'FAQ article not found');
  const resDel = await Faq.deleteOne({ _id: req.params.id });
  if (!resDel.deletedCount) throw new HttpError(404, 'FAQ article not found');
  res.json({ ok: true });
}

module.exports = { listFaq, getFaq, createFaq, updateFaq, deleteFaq };
