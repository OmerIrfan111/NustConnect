const crypto = require('node:crypto');
const mongoose = require('mongoose');
const { HttpError } = require('../../../core/errors');
const HelpBox = require('../models/HelpBox');
const Faq = require('../models/Faq');
const { validateHelpBoxSubmit, validateHelpBoxAnswer } = require('../validation');

/**
 * In-memory rate limiter for anonymous Help Box submissions (PROJECT_PLAN §8 C2 Phase 3).
 * Keeps ephemeral hashed IP keys ONLY in process memory, never persisted to DB or logs.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const memoryHits = new Map();
const processSalt = crypto.randomBytes(16).toString('hex');

function checkAnonymousRateLimit(req, { force = false } = {}) {
  if (!force && process.env.NODE_ENV === 'test') return;
  const rawIp = String(req.ip || req.socket?.remoteAddress || 'local');
  const ephemeralKey = crypto.createHmac('sha256', processSalt).update(rawIp).digest('hex');
  const now = Date.now();
  const recent = (memoryHits.get(ephemeralKey) || []).filter((ts) => now - ts < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    throw new HttpError(429, 'Too many anonymous questions submitted. Please wait a few minutes.');
  }
  recent.push(now);
  memoryHits.set(ephemeralKey, recent);
}

/** POST /api/support/helpbox — intentionally NEVER reads req.user or stores IP/userId. */
async function submitQuestion(req, res) {
  checkAnonymousRateLimit(req);
  const { category, question } = validateHelpBoxSubmit(req.body);
  // Explicitly construct only anonymous fields — no req.user, no ip, no headers.
  const entry = await HelpBox.create({ category, question, status: 'open' });
  res.status(201).json({ entry: entry.toPublic() });
}

/** GET /api/support/helpbox/answered — public/student view of answered questions (no identity exists). */
async function listAnswered(req, res) {
  const { category } = req.query;
  const filter = { status: 'answered' };
  if (category && category !== 'all') filter.category = String(category);
  const rows = await HelpBox.find(filter).sort({ answeredAt: -1, createdAt: -1 }).limit(50);
  res.json({ entries: rows.map((r) => r.toPublic()) });
}

/** GET /api/support/helpbox — staff queue (moderator/admin). Never exposes identity because none is stored. */
async function listQueue(req, res) {
  const { status } = req.query;
  const filter = {};
  if (status && status !== 'all') filter.status = String(status);
  const rows = await HelpBox.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json({ entries: rows.map((r) => r.toPublic()) });
}

/** POST /api/support/helpbox/:id/answer — staff answers and optionally publishes as an FAQ article. */
async function answerQuestion(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Help box entry not found');
  const entry = await HelpBox.findById(req.params.id);
  if (!entry) throw new HttpError(404, 'Help box entry not found');

  const { answer, publishAsFaq, faqTitle, faqCategory } = validateHelpBoxAnswer(req.body);

  let faq = null;
  if (publishAsFaq) {
    faq = await Faq.create({
      title: faqTitle || entry.question.slice(0, 120),
      category: faqCategory || 'general',
      body: answer,
      tags: ['help-box', entry.category],
    });
    entry.publishedFaqId = String(faq._id);
  }

  entry.answer = answer;
  entry.status = 'answered';
  entry.answeredByRole = req.user.role;
  entry.answeredAt = new Date();
  await entry.save();

  res.json({ entry: entry.toPublic(), faq: faq ? faq.toPublic() : null });
}

/** POST /api/support/helpbox/:id/dismiss — staff dismisses spam/duplicate help-box item. */
async function dismissQuestion(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Help box entry not found');
  const entry = await HelpBox.findById(req.params.id);
  if (!entry) throw new HttpError(404, 'Help box entry not found');
  entry.status = 'dismissed';
  await entry.save();
  res.json({ entry: entry.toPublic() });
}

module.exports = {
  submitQuestion,
  listAnswered,
  listQueue,
  answerQuestion,
  dismissQuestion,
  checkAnonymousRateLimit,
  _memoryHits: memoryHits,
};
