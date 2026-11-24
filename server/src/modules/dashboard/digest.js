/**
 * Email digest for important notifications.
 *
 * `runDigest(registry)` finds notifications that are important, still unread, not yet emailed and recent, groups them per
 * user, emails each user one summary, and marks the notifications as emailed (so nobody gets the same item twice).
 *
 * Email addresses never leave the auth module's API. The digest asks the auth module's server contract
 * `contactForNotifications(userIds) -> [{ id, name, email }]` (only users who allow email notifications), reached through
 * the loader registry, never by import. Without that contract nothing is sent.
 *
 * It is triggered by `POST /api/dashboard/digest/run` with the `X-Digest-Key` header (see index.js), so a scheduler such as
 * cron or Windows Task Scheduler can call it once a day.
 */
const nodemailer = require('nodemailer');
const config = require('../../core/config');
const Notification = require('./models/Notification');

let transport;
const getTransport = () =>
  (transport ||= config.smtp.host
    ? nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
      })
    : nodemailer.createTransport({ jsonTransport: true }));

/** Default sender. Never throws: a mail outage must not break the digest run. Resolves to true when handed to the transport. */
async function defaultSend({ to, subject, text }) {
  try {
    await getTransport().sendMail({ from: config.smtp.from, to, subject, text });
    if (!config.smtp.host && !config.isTest) console.log(`[digest:dev] to ${to}\n${subject}\n${text}\n`);
    return true;
  } catch (err) {
    console.error('[digest] failed to send:', err.message);
    return false;
  }
}

function compose(contact, items) {
  const lines = items.map((n) => `- ${n.title}${n.body ? `: ${n.body}` : ''}${n.link ? `\n  ${config.clientUrl}${n.link}` : ''}`);
  return {
    to: contact.email,
    subject: `NUSTConnect: ${items.length} important update${items.length === 1 ? '' : 's'} for you`,
    text: `Hi ${contact.name},\n\nYou have ${items.length} unread important update${items.length === 1 ? '' : 's'}:\n\n${lines.join('\n')}\n\nOpen NUSTConnect to see everything: ${config.clientUrl}/notifications\n\nYou can turn these emails off in Settings.`,
  };
}

/**
 * @returns {{ users: number, emails: number, notifications: number, skipped?: string }}
 */
async function runDigest(registry, { now = new Date(), sinceHours = 24, send = defaultSend } = {}) {
  const since = new Date(now.getTime() - sinceHours * 3600 * 1000);
  const pending = await Notification.find({ important: true, read: false, emailedAt: null, createdAt: { $gte: since } }).limit(5000);
  if (pending.length === 0) return { users: 0, emails: 0, notifications: 0 };

  const byUser = new Map();
  for (const n of pending) byUser.set(n.userId, [...(byUser.get(n.userId) || []), n]);

  const lookup = registry.get('auth')?.contactForNotifications;
  if (typeof lookup !== 'function') return { users: byUser.size, emails: 0, notifications: 0, skipped: 'no-auth-contract' };

  const contacts = await lookup([...byUser.keys()]);
  let emails = 0;
  let notifications = 0;
  for (const contact of contacts || []) {
    const items = byUser.get(String(contact.id));
    if (!items || !contact.email) continue;
    if (await send(compose(contact, items))) {
      await Notification.updateMany({ _id: { $in: items.map((n) => n._id) } }, { emailedAt: now });
      emails += 1;
      notifications += items.length;
    }
  }
  return { users: byUser.size, emails, notifications };
}

module.exports = { runDigest, compose };
