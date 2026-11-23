/**
 * notify() contract (docs/CONTRACTS.md §3). BASE STUB.
 * Owner: A2 (module/dashboard) replaces this with a real notification insert. Same signature.
 *
 *   notify(userId, { type, title, body, link })   // link = client route, e.g. '/rides/123'
 *
 * Stub behaviour: console.log only. Never throws, so callers need no try/catch.
 */
async function notify(userId, { type, title, body, link } = {}) {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[notify:stub] -> ${userId} (${type || 'info'}) ${title || ''} ${body || ''} ${link || ''}`.trim());
  }
  return null;
}

module.exports = { notify };
