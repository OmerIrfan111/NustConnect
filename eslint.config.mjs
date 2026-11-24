/**
 * ESLint (flat config) for the whole repo.
 *
 * The important part is the IMPORT BOUNDARY (docs/PROJECT_PLAN.md section 2.1 rule 4, CLAUDE.md rule 3):
 * a module may never import another module. The only sanctioned exceptions are the session contract:
 *   client: client/src/modules/auth/useAuth.js        server: server/src/modules/auth/session.js
 * Everything else crosses modules through the contracts in docs/CONTRACTS.md (the server registry, route paths, HTTP).
 */
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export const SLUGS = ['auth', 'dashboard', 'admin', 'rideshare', 'marketplace', 'reviews', 'lostfound', 'support', 'campus'];

/** The one file per side that every module may import from the auth module. */
const SESSION_CONTRACT = ['useAuth', 'useAuth.js', 'session', 'session.js'];

/**
 * Patterns that forbid importing module `other` from inside module `own`.
 * Relative imports are matched by the `../<other>/` segment, absolute-ish ones by `modules/<other>/`.
 */
export function boundaryPatterns(own) {
  return SLUGS.filter((s) => s !== own).map((other) => ({
    group: [`**/modules/${other}`, `**/modules/${other}/**`, `../${other}`, `../${other}/**`, `../../${other}`, `../../${other}/**`],
    message: `Modules must not import each other ("${own}" -> "${other}"). Use the contracts in docs/CONTRACTS.md or link by route path.`,
  }));
}

/**
 * `auth` is special: any module may import its session contract file. Those two files are allowed by listing auth's
 * boundary pattern WITHOUT matching the contract files (negated with a leading `!`).
 */
const withSessionException = (patterns) =>
  patterns.map((p) =>
    p.group.some((g) => g.includes('/auth') || g.endsWith('auth'))
      ? { ...p, group: [...p.group, ...SESSION_CONTRACT.flatMap((f) => [`!**/auth/${f}`, `!../auth/${f}`, `!../../auth/${f}`])] }
      : p,
  );

// Client code uses ES `import`; server code is CommonJS `require`, which needs the sibling rule.
const moduleBoundary = (side, own) => ({
  files: [`${side}/src/modules/${own}/**/*.{js,jsx}`],
  rules: {
    [side === 'server' ? 'no-restricted-modules' : 'no-restricted-imports']: [
      'error',
      { patterns: withSessionException(boundaryPatterns(own)) },
    ],
  },
});

const coreMayNotImportModules = (side) => ({
  files: [`${side}/src/core/ui/**/*.{js,jsx}`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/modules/**', ...SESSION_CONTRACT.map((f) => `!**/modules/auth/${f}`)],
            message: 'The UI kit is shared by every module: it must not import from any module (except the session contract).',
          },
        ],
      },
    ],
  },
});

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/uploads/**', 'docs/**', 'client/public/**'] },
  js.configs.recommended,

  // ---- Server: CommonJS on Node, Jest in test files
  {
    files: ['server/**/*.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'commonjs', globals: { ...globals.node } },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }] },
  },
  {
    files: ['server/**/*.test.js', 'server/**/testkit.js'],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
  },

  // ---- Client: ES modules + React, Vitest globals in tests
  {
    files: ['client/**/*.{js,jsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  {
    files: ['client/**/*.test.{js,jsx}', 'client/src/test/**/*.js'],
    languageOptions: { globals: { ...globals.browser, ...globals.node, vi: 'readonly', describe: 'readonly', it: 'readonly', test: 'readonly', expect: 'readonly', beforeEach: 'readonly', afterEach: 'readonly', beforeAll: 'readonly', afterAll: 'readonly' } },
  },
  { files: ['client/vite.config.js', 'eslint.config.mjs', '.github/**/*.mjs'], languageOptions: { globals: { ...globals.node } } },
  { files: ['.github/**/*.mjs'], languageOptions: { sourceType: 'module', ecmaVersion: 2023 } },

  // ---- Import boundaries: one block per module and side
  ...['client', 'server'].flatMap((side) => SLUGS.map((own) => moduleBoundary(side, own))),
  coreMayNotImportModules('client'),

  prettier,
];
