/**
 * notify() contract (docs/CONTRACTS.md §3). Owner: A2.
 *
 *   notify(userId, { type, title, body, link })   // link = client route, e.g. '/rides/123'
 *
 * Creates a notification shown in the user's bell and on /notifications. It never throws: a failed notification must
 * not break the action that triggered it (a ride request, a complaint update, ...), so errors are only logged.
 * Resolves to the stored notification, or null when it could not be stored.
 */
const Notification = require('./models/Notification');

// A link must be a same-site client route. Anything else is dropped so a module cannot send users off-site.
const safeLink = (link) => (typeof link === 'string' && link.startsWith('/') && !link.startsWith('//') ? link : '');

async function notify(userId, { type = 'info', title, body = '', link = '' } = {}) {
  if (!userId || !title) return null;
  try {
    const doc = await Notification.create({
      userId: String(userId),
      type,
      title: String(title).slice(0, 140),
      body: String(body).slice(0, 500),
      link: safeLink(link),
    });
    return doc.toPublic();
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') console.error('[notify] failed:', err.message);
    return null;
  }
}

module.exports = { notify };
