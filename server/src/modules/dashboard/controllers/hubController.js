const { search, summary } = require('../aggregate');
const { HttpError } = require('../../../core/errors');

const registryOf = (req) => req.app.locals.modules || new Map();

/** GET /search?q=&type=&limit= (verified users) */
async function searchAll(req, res) {
  const q = String(req.query.q || '').trim().slice(0, 100);
  if (q.length < 2) throw new HttpError(400, 'Type at least 2 characters to search', { q: 'Type at least 2 characters to search' });
  const type = typeof req.query.type === 'string' && req.query.type ? req.query.type.slice(0, 40) : undefined;
  res.json(await search(registryOf(req), q, { type, limit: req.query.limit, timeoutMs: req.app.locals.providerTimeoutMs }));
}

/** GET /summary: stats + recent activity from every module that provides a summary. */
async function summarise(req, res) {
  res.json(await summary(registryOf(req), req.user.id, { timeoutMs: req.app.locals.providerTimeoutMs }));
}

module.exports = { searchAll, summarise };
