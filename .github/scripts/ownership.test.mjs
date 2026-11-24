import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, violations, SLUGS, moduleFolders } from './ownership.mjs';

test('classifies branch names', () => {
  assert.deepEqual(classify('module/auth'), { kind: 'module', slug: 'auth' });
  assert.deepEqual(classify('module/rideshare/seat-requests'), { kind: 'module', slug: 'rideshare' });
  assert.deepEqual(classify('base/server'), { kind: 'base', name: 'base/server' });
  assert.equal(classify('fix/login-redirect').kind, 'fix');
  assert.equal(classify('core-change/routes-tests').kind, 'core-change');
  assert.equal(classify('module/unknown').kind, 'other');
  assert.equal(classify('base/mystery').kind, 'other');
  assert.equal(classify('feature/x').kind, 'other');
  assert.equal(classify('').kind, 'other');
});

test('a module branch may edit only its own three folders', () => {
  const ok = ['client/src/modules/auth/pages/Login.jsx', 'server/src/modules/auth/index.js', 'docs/modules/auth/README.md'];
  assert.deepEqual(violations('module/auth', ok), []);
  assert.deepEqual(violations('module/auth/profile-page', ok), []);
});

test('a module branch is flagged for core, other modules, root files and shared docs', () => {
  const bad = [
    'client/src/core/router/routes.jsx',
    'client/src/modules/dashboard/pages/Dashboard.jsx',
    'server/src/core/app.js',
    'package.json',
    'package-lock.json',
    'CLAUDE.md',
    'docs/STATUS.md',
    '.github/workflows/ci.yml',
    'docs/modules/admin/README.md',
    'client/src/modules/auth-extra/x.js', // prefix trap: not the auth folder
  ];
  assert.deepEqual(violations('module/auth', [...bad, 'client/src/modules/auth/a.js']), bad);
});

test('every slug is covered, and its folders end with a slash (no prefix traps)', () => {
  assert.equal(SLUGS.length, 9);
  for (const s of SLUGS) for (const f of moduleFolders(s)) assert.ok(f.endsWith('/'));
});

test('base/server may edit server core, module stubs and server/package.json only', () => {
  assert.deepEqual(violations('base/server', ['server/src/core/app.js', 'server/src/modules/auth/index.js', 'server/package.json']), []);
  assert.deepEqual(violations('base/server', ['client/src/core/App.jsx', 'package.json']), ['client/src/core/App.jsx', 'package.json']);
});

test('base/client may edit client core but NOT the UI kit', () => {
  assert.deepEqual(violations('base/client', ['client/src/core/App.jsx', 'client/src/main.jsx', 'client/vite.config.js']), []);
  assert.deepEqual(violations('base/client', ['client/src/core/ui/Button.jsx']), ['client/src/core/ui/Button.jsx']);
});

test('base/tooling may edit the UI kit, .github, root configs and doc templates', () => {
  const ok = ['client/src/core/ui/Button.jsx', '.github/workflows/ci.yml', 'package.json', 'eslint.config.mjs', '.env.example', 'docs/modules/_template/README.md'];
  assert.deepEqual(violations('base/tooling', ok), []);
  assert.deepEqual(violations('base/tooling', ['client/src/core/router/routes.jsx', 'server/src/core/app.js']), ['client/src/core/router/routes.jsx', 'server/src/core/app.js']);
});

test('fix/* and core-change/* branches are not path-restricted, unknown branches are flagged entirely', () => {
  assert.deepEqual(violations('fix/small', ['server/src/core/app.js']), []);
  assert.deepEqual(violations('core-change/claude-md', ['CLAUDE.md']), []);
  assert.deepEqual(violations('whatever', ['README.md']), ['README.md']);
});
