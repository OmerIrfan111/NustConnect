const Report = require('../models/Report');
const Campaign = require('../models/Campaign');
const Audit = require('../models/AuditEntry');

const TIMEOUT_MS = 1500;

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('provider timed out')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Usage counts from every module's `summaryProvider`, for the analytics page.
 *
 * Privacy: summaries are per user, so this asks each provider for its platform-wide figure by passing NO user
 * (`summaryProvider(null, { scope: 'all' })`). A module that returns a per-user number for `null` simply contributes
 * nothing useful. Only `stat.label` and `stat.value` are kept; `recent` (which can hold personal activity) is always
 * dropped, and anything that is not a plain label and number is ignored. Failing, slow or missing providers are skipped.
 */
async function moduleStats(registry, timeoutMs) {
  const entries = [...registry.values()].filter((m) => typeof m.summaryProvider === 'function');
  const ran = await Promise.all(
    entries.map(async (m) => {
      try {
        const out = await withTimeout(Promise.resolve().then(() => m.summaryProvider(null, { scope: 'all' })), timeoutMs);
        const stat = out && typeof out === 'object' ? out.stat : null;
        const value = Number(stat?.value);
        if (stat && typeof stat.label === 'string' && Number.isFinite(value)) {
          return { slug: m.slug, stat: { label: stat.label.slice(0, 60), value } };
        }
        return { slug: m.slug, skipped: true };
      } catch {
        return { slug: m.slug, skipped: true };
      }
    }),
  );
  return {
    modules: ran.filter((r) => r.stat).map((r) => ({ module: r.slug, label: r.stat.label, value: r.stat.value })).sort((a, b) => a.module.localeCompare(b.module)),
    skipped: ran.filter((r) => r.skipped).map((r) => r.slug).sort(),
  };
}

/** GET /analytics (admin): aggregate counts only, never personal data. */
async function analytics(req, res) {
  const registry = req.app.locals.modules || new Map();
  const [fromModules, open, resolved, dismissed, campaigns, auditEntries] = await Promise.all([
    moduleStats(registry, req.app.locals.providerTimeoutMs || TIMEOUT_MS),
    Report.countDocuments({ status: 'open' }),
    Report.countDocuments({ status: 'resolved' }),
    Report.countDocuments({ status: 'dismissed' }),
    Campaign.find({}).lean(),
    Audit.countDocuments({}),
  ]);

  res.json({
    modules: fromModules.modules,
    skipped: fromModules.skipped,
    moduleCount: registry.size,
    platform: {
      reportsOpen: open,
      reportsResolved: resolved,
      reportsDismissed: dismissed,
      campaigns: campaigns.length,
      campaignsActive: campaigns.filter((c) => c.status === 'active').length,
      pledgedTotal: campaigns.reduce((sum, c) => sum + (c.raisedAmount || 0), 0),
      auditEntries,
    },
  });
}

module.exports = { analytics, moduleStats };
