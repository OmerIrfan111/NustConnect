/**
 * Email sending (nodemailer). With SMTP_HOST set, mail goes through that server (Ethereal works for development).
 * Without it, messages are not sent: they are printed to the server console, so the verification / reset link can be
 * copied during development. Sending never throws, so a mail outage cannot break registration.
 */
const nodemailer = require('nodemailer');
const config = require('../../core/config');

let transport;
function getTransport() {
  if (transport) return transport;
  transport = config.smtp.host
    ? nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
      })
    : nodemailer.createTransport({ jsonTransport: true });
  return transport;
}

async function sendMail({ to, subject, text }) {
  try {
    const info = await getTransport().sendMail({ from: config.smtp.from, to, subject, text });
    if (!config.smtp.host && !config.isTest) console.log(`[mail:dev] to ${to}\n${subject}\n${text}\n`);
    return info;
  } catch (err) {
    console.error('[mail] failed to send:', err.message);
    return null;
  }
}

const link = (path, token) => `${config.clientUrl}${path}?token=${token}`;

const sendVerificationEmail = (user, token) =>
  sendMail({
    to: user.email,
    subject: 'Verify your NUSTConnect email',
    text: `Hi ${user.name},\n\nConfirm your NUST email to activate your account (valid for 24 hours):\n${link('/verify', token)}\n\nIf you did not register, ignore this message.`,
  });

const sendResetEmail = (user, token) =>
  sendMail({
    to: user.email,
    subject: 'Reset your NUSTConnect password',
    text: `Hi ${user.name},\n\nChoose a new password (link valid for 1 hour, works once):\n${link('/forgot-password', token)}\n\nIf you did not ask for this, ignore this message. Your password stays the same.`,
  });

module.exports = { sendMail, sendVerificationEmail, sendResetEmail };
