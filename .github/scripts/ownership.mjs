/**
 * Path-ownership rules (CLAUDE.md section 2 and 5, docs/PROJECT_PLAN.md sections 2.3 and 3.3).
 * Pure functions, so they are unit-tested in ownership.test.mjs. The CLI is check-ownership.mjs.
 */

export const SLUGS = ['auth', 'dashboard', 'admin', 'rideshare', 'marketplace', 'reviews', 'lostfound', 'support', 'campus'];

/** Folder prefixes a `module/<slug>` branch may touch. */
export const moduleFolders = (slug) => [`client/src/modules/${slug}/`, `server/src/modules/${slug}/`, `docs/modules/${slug}/`];

/** What each base branch may edit (CLAUDE.md section 5). A trailing `/` is a folder prefix, anything else is an exact file. */
export const BASE_RULES = {
  'base/client': {
    allow: ['client/src/core/', 'client/src/modules/', 'client/src/main.jsx', 'client/src/test/', 'client/index.html', 'client/vite.config.js', 'client/package.json', 'client/public/', 'docs/CONTRACTS.md'],
    deny: ['client/src/core/ui/'],
  },
  'base/server': {
    allow: ['server/src/core/', 'server/src/modules/', 'server/package.json'],
    deny: [],
  },
  'base/tooling': {
    allow: [
      'client/src/core/ui/',
      '.github/',
      'docs/modules/',
      'package.json',
      'package-lock.json',
      'eslint.config.mjs',
      '.prettierrc.json',
      '.prettierignore',
      '.editorconfig',
      '.gitattributes',
      '.env.example',
      '.gitignore',
      'README.md',
      'CONTRIBUTING.md',
    ],
    deny: [],
  },
};

const matches = (file, rule) => (rule.endsWith('/') ? file.startsWith(rule) : file === rule);

/** Branch kinds: module/<slug>[/<task>], base/<name>, fix/<topic>, core-change/<topic>, anything else. */
export function classify(branch) {
  const parts = String(branch || '').split('/');
  if (parts[0] === 'module' && SLUGS.includes(parts[1])) return { kind: 'module', slug: parts[1] };
  if (parts[0] === 'base' && BASE_RULES[`base/${parts[1]}`]) return { kind: 'base', name: `base/${parts[1]}` };
  if (parts[0] === 'fix' && parts[1]) return { kind: 'fix' };
  if (parts[0] === 'core-change' && parts[1]) return { kind: 'core-change' };
  return { kind: 'other' };
}

/** Returns the list of changed files that the branch is NOT allowed to touch (empty means the PR is fine). */
export function violations(branch, files) {
  const c = classify(branch);
  if (c.kind === 'module') {
    const allowed = moduleFolders(c.slug);
    return files.filter((f) => !allowed.some((p) => f.startsWith(p)));
  }
  if (c.kind === 'base') {
    const rules = BASE_RULES[c.name];
    return files.filter((f) => !rules.allow.some((r) => matches(f, r)) || rules.deny.some((r) => matches(f, r)));
  }
  // fix/* and core-change/* are small, reviewed branches (a core-change issue is required): not path-restricted here.
  // Any other branch name is not part of the workflow, so everything is flagged.
  if (c.kind === 'other') return files;
  return [];
}
