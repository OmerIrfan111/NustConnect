/**
 * Central server configuration. Reads the repo-root `.env` (shared with the client) once.
 * Modules read settings from here instead of touching process.env directly.
 */
const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });

const env = process.env;
const list = (value, fallback) =>
  (value ?? fallback)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const ROLES = ['student', 'alumni', 'moderator', 'admin'];

const config = {
  env: env.NODE_ENV || 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: Number(env.PORT) || 5000,
  mongoUri: env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nustconnect',
  clientUrl: env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret: env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: env.JWT_EXPIRES_IN || '7d',
  allowedEmailDomains: list(env.ALLOWED_EMAIL_DOMAINS, 'nust.edu.pk,students.nust.edu.pk'),
  uploadDir: path.resolve(__dirname, '../..', env.UPLOAD_DIR || 'uploads'),
  maxUploadMb: Number(env.MAX_UPLOAD_MB) || 5,
  rateLimit: {
    windowMs: Number(env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(env.RATE_LIMIT_MAX) || 300,
  },
  // Dev fake-auth switch, shared with the client (same variable names).
  roles: ROLES,
  fakeAuth: env.VITE_DEV_FAKE_AUTH === 'true',
  fakeRole: ROLES.includes(env.VITE_DEV_FAKE_ROLE) ? env.VITE_DEV_FAKE_ROLE : 'student',
  smtp: {
    host: env.SMTP_HOST || '',
    port: Number(env.SMTP_PORT) || 587,
    user: env.SMTP_USER || '',
    pass: env.SMTP_PASS || '',
    from: env.MAIL_FROM || 'NUSTConnect <no-reply@nustconnect.local>',
  },
};

module.exports = config;
