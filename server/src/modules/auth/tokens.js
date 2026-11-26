/** Issue and consume single-use tokens (email verification, password reset). */
const crypto = require('node:crypto');
const Token = require('./models/Token');

const HOUR = 60 * 60 * 1000;
const TTL = { verify: 24 * HOUR, reset: 1 * HOUR };

const hash = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

/** Creates a token for the user and returns the raw value (to put in an email link). Older unused tokens of the same type stop working. */
async function issueToken(userId, type) {
  await Token.deleteMany({ userId: String(userId), type, usedAt: null });
  const raw = crypto.randomBytes(32).toString('hex');
  await Token.create({
    userId: String(userId),
    type,
    tokenHash: hash(raw),
    expiresAt: new Date(Date.now() + TTL[type]),
  });
  return raw;
}

/**
 * Atomically marks a valid token as used and returns its userId, or null when it is unknown, expired or already used.
 * Because the mark-as-used is a single conditional update, a token can never be consumed twice.
 */
async function consumeToken(raw, type) {
  if (typeof raw !== 'string' || raw.length < 20 || raw.length > 200) return null;
  const doc = await Token.findOneAndUpdate(
    { tokenHash: hash(raw), type, usedAt: null, expiresAt: { $gt: new Date() } },
    { usedAt: new Date() },
    { returnDocument: 'before' },
  );
  return doc ? doc.userId : null;
}

module.exports = { issueToken, consumeToken, hash, TTL };
