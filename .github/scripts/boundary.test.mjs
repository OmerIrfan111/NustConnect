/**
 * Proves the ESLint import-boundary rule works: modules may not import each other, except the session contract.
 * Lints in-memory snippets under real module paths with the repo's own eslint.config.mjs.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESLint } from 'eslint';

const eslint = new ESLint({ cwd: process.cwd() });

/** Lints `code` as if it lived at `filePath` and returns the boundary messages. */
async function boundaryErrors(filePath, code) {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((m) => m.ruleId === 'no-restricted-imports' || m.ruleId === 'no-restricted-modules');
}

const DASH = 'client/src/modules/dashboard/pages/Dashboard.jsx';
const DASH_SERVER = 'server/src/modules/dashboard/index.js';

test('client: importing another module is an error', async () => {
  const errs = await boundaryErrors(DASH, "import x from '../../marketplace/api.js';\nexport default x;\n");
  assert.equal(errs.length, 1);
  assert.match(errs[0].message, /must not import each other/);
});

test('client: deep imports into another module are errors too', async () => {
  assert.equal((await boundaryErrors(DASH, "import P from '../../auth/pages/Login.jsx';\nexport default P;\n")).length, 1);
  assert.equal((await boundaryErrors(DASH, "import R from '../../../modules/reviews/x.js';\nexport default R;\n")).length, 1);
});

test('client: the session contract is the one allowed exception', async () => {
  assert.equal((await boundaryErrors(DASH, "import { useAuth } from '../../auth/useAuth.js';\nexport default useAuth;\n")).length, 0);
});

test('client: a module may import its own files and @core', async () => {
  assert.equal((await boundaryErrors(DASH, "import a from '../sampleData.js';\nimport http from '@core/api/http.js';\nexport default [a, http];\n")).length, 0);
});

test('client: the same rule applies to every module, not just one', async () => {
  const errs = await boundaryErrors('client/src/modules/support/pages/X.jsx', "import a from '../../campus/a.js';\nexport default a;\n");
  assert.equal(errs.length, 1);
});

test('server: require() of another module is an error', async () => {
  const errs = await boundaryErrors(DASH_SERVER, "const m = require('../marketplace/models/Item');\nmodule.exports = m;\n");
  assert.equal(errs.length, 1);
});

test('server: the session contract and the module own files are allowed', async () => {
  const code = "const { requireAuth } = require('../auth/session');\nconst own = require('./controllers/x');\nmodule.exports = [requireAuth, own];\n";
  assert.equal((await boundaryErrors(DASH_SERVER, code)).length, 0);
});

test('server: other auth files (models, controllers) are NOT allowed', async () => {
  assert.equal((await boundaryErrors(DASH_SERVER, "const U = require('../auth/models/User');\nmodule.exports = U;\n")).length, 1);
});

test('UI kit: may use the session contract, but not any module', async () => {
  const ui = 'client/src/core/ui/ReportButton.jsx';
  assert.equal((await boundaryErrors(ui, "import { useAuth } from '../../modules/auth/useAuth.js';\nexport default useAuth;\n")).length, 0);
  assert.equal((await boundaryErrors(ui, "import x from '../../modules/rideshare/x.js';\nexport default x;\n")).length, 1);
});
