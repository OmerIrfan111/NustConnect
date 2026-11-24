/** Express app factory. Kept free of listen()/DB so tests can build it directly. */
const fs = require('node:fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const { loadModules } = require('./loader');
const { notFound, errorHandler } = require('./errors');
const { dbState } = require('./db');

function createApp({ modulesDir } = {}) {
  const app = express();
  app.disable('x-powered-by');

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: config.clientUrl, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  if (!config.isTest) {
    app.use(
      '/api',
      rateLimit({
        windowMs: config.rateLimit.windowMs,
        limit: config.rateLimit.max,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: { status: 429, message: 'Too many requests, please try again later', error: 'Too many requests, please try again later' },
      }),
    );
  }

  fs.mkdirSync(config.uploadDir, { recursive: true });
  app.use('/uploads', express.static(config.uploadDir));

  app.get('/api/health', (req, res) =>
    res.json({ ok: true, env: config.env, db: dbState(), uptime: Math.round(process.uptime()) }),
  );

  const { registry, warnings } = loadModules(app, modulesDir);
  app.locals.modules = registry;
  app.locals.loaderWarnings = warnings;

  app.use('/api', notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
