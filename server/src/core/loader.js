/**
 * Module auto-loader. Globs `server/src/modules/<slug>/index.js`, validates each manifest (docs/CONTRACTS.md §1)
 * and mounts its router at /api/<slug>. No central route table: adding a module never edits a shared file.
 */
const fs = require('node:fs');
const path = require('node:path');

const MODULES_DIR = path.resolve(__dirname, '../modules');

function discoverModules(dir = MODULES_DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(dir, d.name, 'index.js')))
    .map((d) => ({ folder: d.name, manifest: require(path.join(dir, d.name, 'index.js')) }));
}

/** Mount every module on `app`. Returns the registry (slug -> manifest) and any warnings. */
function loadModules(app, dir = MODULES_DIR) {
  const registry = new Map();
  const warnings = [];

  for (const { folder, manifest } of discoverModules(dir)) {
    if (!manifest || typeof manifest !== 'object') {
      warnings.push(`modules/${folder}/index.js must export an object`);
      continue;
    }
    if (manifest.slug !== folder) {
      warnings.push(`modules/${folder}: slug "${manifest.slug}" does not match folder name`);
      continue;
    }
    if (typeof manifest.router !== 'function') {
      warnings.push(`modules/${folder}: missing express router`);
      continue;
    }
    if (registry.has(manifest.slug)) {
      warnings.push(`modules/${folder}: duplicate slug`);
      continue;
    }
    app.use(`/api/${manifest.slug}`, manifest.router);
    registry.set(manifest.slug, manifest);
  }

  warnings.forEach((w) => console.warn(`[loader] ${w}`));
  return { registry, warnings };
}

/** Optional providers collected from the registry, for the dashboard aggregators (A2) and admin hooks (A3). */
const providersOf = (registry, key) =>
  [...registry.values()].filter((m) => m[key]).map((m) => ({ slug: m.slug, [key]: m[key] }));

module.exports = { loadModules, discoverModules, providersOf, MODULES_DIR };
