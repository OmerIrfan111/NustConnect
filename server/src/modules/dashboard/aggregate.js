/**
 * Aggregators for global search (CONTRACTS §4) and dashboard summaries (§5).
 *
 * Every module may export `searchProvider` / `summaryProvider` from its server manifest. The loader keeps all manifests in
 * `app.locals.modules`; this file only reads them. A module with no provider is skipped. A provider that throws, or is
 * slower than the timeout, is skipped too, so one broken or slow module can never break search or the dashboard.
 */

const DEFAULT_TIMEOUT_MS = 1500;

/** Same-site client paths only. Anything else becomes '' so a module cannot send users off-site. */
const safeUrl = (u) => (typeof u === 'string' && u.startsWith('/') && !u.startsWith('//') ? u : '');

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('provider timed out')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Runs `fn(provider)` for every module that has `key`, isolating failures. Resolves to [{ slug, value } | { slug, error }]. */
async function runProviders(registry, key, fn, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const entries = [...registry.values()].filter((m) => typeof m[key] === 'function');
  return Promise.all(
    entries.map(async (m) => {
      try {
        return { slug: m.slug, value: await withTimeout(Promise.resolve().then(() => fn(m[key])), timeoutMs) };
      } catch (err) {
        return { slug: m.slug, error: err.message };
      }
    }),
  );
}

const clean = (r, slug) => ({
  id: String(r.id ?? ''),
  title: String(r.title ?? '').slice(0, 140),
  snippet: String(r.snippet ?? '').slice(0, 240),
  type: String(r.type ?? slug).slice(0, 40),
  url: safeUrl(r.url),
});

/**
 * search(registry, q, { type, limit }) -> { q, groups: [{ module, results }], types, total, skipped }
 * `skipped` lists modules that had a provider but failed or timed out (the others still answer).
 */
async function search(registry, q, { type, limit = 10, timeoutMs } = {}) {
  const perModule = Math.min(25, Math.max(1, Number(limit) || 10));
  const ran = await runProviders(registry, 'searchProvider', (p) => p(q, { limit: perModule }), timeoutMs);

  const groups = [];
  const skipped = [];
  const types = new Set();
  for (const r of ran) {
    if (r.error) {
      skipped.push(r.slug);
      continue;
    }
    const all = (Array.isArray(r.value) ? r.value : []).slice(0, perModule).map((x) => clean(x, r.slug)).filter((x) => x.url);
    all.forEach((x) => types.add(x.type));
    const results = type ? all.filter((x) => x.type === type) : all;
    if (results.length) groups.push({ module: r.slug, results });
  }
  groups.sort((a, b) => a.module.localeCompare(b.module));
  return { q, groups, types: [...types].sort(), total: groups.reduce((n, g) => n + g.results.length, 0), skipped };
}

/**
 * summary(registry, userId) -> { stats: [{ module, label, value }], recent: [{ module, text, url, at }], skipped }
 * Newest activity first, at most 8 entries.
 */
async function summary(registry, userId, { timeoutMs } = {}) {
  const ran = await runProviders(registry, 'summaryProvider', (p) => p(userId), timeoutMs);
  const stats = [];
  const recent = [];
  const skipped = [];
  for (const r of ran) {
    if (r.error || !r.value || typeof r.value !== 'object') {
      skipped.push(r.slug);
      continue;
    }
    const { stat, recent: items } = r.value;
    if (stat && typeof stat.label === 'string' && Number.isFinite(Number(stat.value))) {
      stats.push({ module: r.slug, label: stat.label.slice(0, 60), value: Number(stat.value) });
    }
    for (const it of Array.isArray(items) ? items : []) {
      const at = new Date(it.at);
      recent.push({
        module: r.slug,
        text: String(it.text ?? '').slice(0, 200),
        url: safeUrl(it.url),
        at: Number.isNaN(at.getTime()) ? null : at.toISOString(),
      });
    }
  }
  recent.sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  return { stats, recent: recent.slice(0, 8), skipped };
}

module.exports = { search, summary, safeUrl, DEFAULT_TIMEOUT_MS };
