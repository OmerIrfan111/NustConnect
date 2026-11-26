/** Input validation for the auth endpoints. Pure functions, no DB, so they are easy to unit test. */
const config = require('../../core/config');
const { HttpError } = require('../../core/errors');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEPARTMENTS = [
  'SEECS', 'SMME', 'SCEE', 'NBS', 'S3H', 'SADA', 'SNS', 'SCME', 'NICE', 'ASAB', 'IGIS', 'SINES', 'Other',
];

const str = (v) => (typeof v === 'string' ? v.trim() : '');

/** True when the email's domain is in ALLOWED_EMAIL_DOMAINS (exact match). Enforced server-side. */
function isAllowedEmail(email, domains = config.allowedEmailDomains) {
  const at = email.lastIndexOf('@');
  if (at < 1) return false;
  return domains.map((d) => d.toLowerCase()).includes(email.slice(at + 1).toLowerCase());
}

function passwordProblem(password) {
  if (typeof password !== 'string' || password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 72) return 'Password must be at most 72 characters';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Password must contain a letter and a number';
  return null;
}

function fail(details) {
  return new HttpError(400, Object.values(details)[0], details);
}

/** Returns a clean `{ name, email, department, batch, password }` or throws a 400 HttpError with per-field details. */
function validateRegister(body = {}) {
  const data = {
    name: str(body.name),
    email: str(body.email).toLowerCase(),
    department: str(body.department),
    batch: str(body.batch),
    password: body.password,
  };
  const errors = {};

  if (data.name.length < 2) errors.name = 'Enter your full name';
  if (!EMAIL_RE.test(data.email)) errors.email = 'Invalid email';
  else if (!isAllowedEmail(data.email)) {
    errors.email = `Use your NUST email (${config.allowedEmailDomains.map((d) => '@' + d).join(', ')})`;
  }
  if (!data.department) errors.department = 'Select your department or school';
  if (!/^\d{4}$/.test(data.batch)) errors.batch = 'Enter your batch year, for example 2023';
  const pw = passwordProblem(data.password);
  if (pw) errors.password = pw;
  if (body.confirmPassword !== undefined && body.confirmPassword !== data.password) {
    errors.confirmPassword = 'Passwords do not match';
  }
  if (body.acceptTerms !== true) errors.acceptTerms = 'You must accept the Terms and Privacy Policy';

  if (Object.keys(errors).length) throw fail(errors);
  return data;
}

function validateLogin(body = {}) {
  const email = str(body.email).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password) throw fail({ email: 'Enter your email and password' });
  return { email, password, remember: body.remember === true };
}

function validateForgot(body = {}) {
  const email = str(body.email).toLowerCase();
  if (!EMAIL_RE.test(email)) throw fail({ email: 'Invalid email' });
  return { email };
}

function validateReset(body = {}) {
  const errors = {};
  const pw = passwordProblem(body.password);
  if (pw) errors.password = pw;
  if (body.confirmPassword !== undefined && body.confirmPassword !== body.password) {
    errors.confirmPassword = 'Passwords do not match';
  }
  if (typeof body.token !== 'string' || !body.token) errors.token = 'This reset link is not valid';
  if (Object.keys(errors).length) throw fail(errors);
  return { token: body.token, password: body.password };
}

/** Only the fields present are validated and returned. */
function validateProfile(body = {}) {
  const out = {};
  const errors = {};
  if (body.name !== undefined) {
    out.name = str(body.name);
    if (out.name.length < 2 || out.name.length > 80) errors.name = 'Enter your full name';
  }
  if (body.department !== undefined) {
    out.department = str(body.department);
    if (!DEPARTMENTS.includes(out.department)) errors.department = 'Select your department or school';
  }
  if (body.batch !== undefined) {
    out.batch = str(body.batch);
    if (!/^\d{4}$/.test(out.batch)) errors.batch = 'Enter your batch year, for example 2023';
  }
  if (Object.keys(errors).length) throw fail(errors);
  return out;
}

const VISIBILITY = ['everyone', 'verified', 'private'];
const CONTACT = ['in-app', 'email', 'phone'];

function validateSettings(body = {}) {
  const out = {};
  const errors = {};
  if (body.profileVisibility !== undefined) {
    if (!VISIBILITY.includes(body.profileVisibility)) errors.profileVisibility = 'Invalid visibility';
    else out['settings.profileVisibility'] = body.profileVisibility;
  }
  if (body.contactPreference !== undefined) {
    if (!CONTACT.includes(body.contactPreference)) errors.contactPreference = 'Invalid contact preference';
    else out['settings.contactPreference'] = body.contactPreference;
  }
  if (body.emailNotifications !== undefined) {
    if (typeof body.emailNotifications !== 'boolean') errors.emailNotifications = 'Invalid value';
    else out['settings.emailNotifications'] = body.emailNotifications;
  }
  if (body.phone !== undefined) {
    const phone = str(body.phone);
    if (phone && !/^\+?[0-9 -]{7,20}$/.test(phone)) errors.phone = 'Enter a valid phone number';
    else out.phone = phone;
  }
  if (Object.keys(errors).length) throw fail(errors);
  return out;
}

module.exports = {
  validateRegister, validateLogin, validateForgot, validateReset, validateProfile, validateSettings,
  isAllowedEmail, passwordProblem, DEPARTMENTS,
};
