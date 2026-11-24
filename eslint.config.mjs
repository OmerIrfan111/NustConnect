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

/** The files every module may import from the auth module (the session contract), with and without the extension. */
export const SESSION_CONTRACT = ['useAuth', 'useAuth.js', 'session', 'session.js'];

/** How a relative import reaches a sibling module from different folder depths, plus the absolute-ish `modules/<slug>` form. */
const reach = (other) => [`**/modules/${other}/**`, `../${other}/**`, `../../${other}/**`, `../../../${other}/**`, `../../../../${other}/**`];
const reachBare = (other) => [`**/modules/${other}`, `../${other}`, `../../${other}`, `../../../${other}`];

/**
 * Gitignore-style patterns that forbid module `own` from importing module `other`.
 *
 * Note for `auth`: gitignore cannot re-include a file whose parent folder is excluded, so for auth we exclude the CONTENTS
 * (`auth/**`) and then re-include the two session-contract files. The bare `../auth` form is therefore not matched; importing
 * the auth folder's index is covered by the contents rule anyway when it resolves to a file path with a subfolder.
 */
export function boundaryPatterns(own) {
  return SLUGS.filter((s) => s !== own).map((other) => {
    if (other !== 'auth') return { other, group: [...reach(other), ...reachBare(other)] };
    const allow = SESSION_CONTRACT.flatMap((f) => [`!**/modules/auth/${f}`, ...[1, 2, 3, 4].map((n) => `!${'../'.repeat(n)}auth/${f}`)]);
    return { other, group: [...reach('auth'), ...allow] };
  });
}

const message = (own, other) =>
  `Modules must not import each other ("${own}" -> "${other}"). Use the contracts in docs/CONTRACTS.md or link by route path.`;

// Client code uses ES `import` (object patterns with a message). Server code is CommonJS `require`: its rule only takes plain strings.
const moduleBoundary = (side, own) => {
  const patterns = boundaryPatterns(own);
  return {
    files: [`${side}/src/modules/${own}/**/*.{js,jsx}`],
    rules:
      side === 'server'
        ? { 'no-restricted-modules': ['error', { patterns: patterns.flatMap((p) => p.group) }] }
        : { 'no-restricted-imports': ['error', { patterns: patterns.map((p) => ({ group: p.group, message: message(own, p.other) })) }] },
  };
};

// The UI kit is shared by everyone, so it must not depend on any module, except the session contract (ReportButton needs useAuth).
const uiKitBoundary = {
  files: ['client/src/core/ui/**/*.{js,jsx}'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/modules/*/**', ...SESSION_CONTRACT.map((f) => `!**/modules/auth/${f}`)],
            message: 'The UI kit is shared by every module: it must not import from any module (except the session contract).',
          },
        ],
      },
    ],
  },
};

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
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },
  { files: ['client/vite.config.js', 'eslint.config.mjs', '.github/**/*.mjs'], languageOptions: { globals: { ...globals.node } } },
  { files: ['.github/**/*.mjs'], languageOptions: { sourceType: 'module', ecmaVersion: 2023 } },

  // ---- Import boundaries: one block per module and side, plus the UI kit
  ...['client', 'server'].flatMap((side) => SLUGS.map((own) => moduleBoundary(side, own))),
  uiKitBoundary,

  prettier,
];
