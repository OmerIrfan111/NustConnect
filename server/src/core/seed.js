/**
 * Seed runner: `npm run seed -- <slug>` (one module) or `npm run seed -- all`.
 * Each module exports `async function seed()` from `server/src/modules/<slug>/seed.js`.
 */
const fs = require('node:fs');
const path = require('node:path');
const { connectDb, disconnectDb } = require('./db');
const { MODULES_DIR } = require('./loader');

async function run(target) {
  const slugs = fs
    .readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(MODULES_DIR, d.name, 'seed.js')))
    .map((d) => d.name);

  const chosen = !target || target === 'all' ? slugs : [target];
  const unknown = chosen.filter((s) => !slugs.includes(s));
  if (unknown.length) throw new Error(`No seed.js for: ${unknown.join(', ')}. Available: ${slugs.join(', ')}`);

  await connectDb();
  for (const slug of chosen) {
    console.log(`[seed] ${slug} ...`);
    await require(path.join(MODULES_DIR, slug, 'seed.js'))();
  }
  console.log('[seed] done');
}

if (require.main === module) {
  run(process.argv[2])
    .catch((err) => {
      console.error(`[seed] ${err.message}`);
      process.exitCode = 1;
    })
    .finally(() => disconnectDb());
}

module.exports = { run };
