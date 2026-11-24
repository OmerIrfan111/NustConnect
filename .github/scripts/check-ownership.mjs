/**
 * CI path-ownership check: fails a pull request that touches files outside its branch's allowed folders.
 *   node .github/scripts/check-ownership.mjs <branch> [base-ref]
 * Defaults: branch = GITHUB_HEAD_REF, base-ref = origin/<GITHUB_BASE_REF or main>. The diff uses `base...HEAD` (changes since the
 * merge base), so merging main into a module branch never counts against it.
 */
import { execFileSync } from 'node:child_process';
import { classify, violations, moduleFolders } from './ownership.mjs';

const branch = process.argv[2] || process.env.GITHUB_HEAD_REF || '';
const base = process.argv[3] || `origin/${process.env.GITHUB_BASE_REF || 'main'}`;

if (!branch) {
  console.error('No branch name given (pass it as an argument or set GITHUB_HEAD_REF).');
  process.exit(2);
}

const files = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { encoding: 'utf8' })
  .split('\n')
  .map((f) => f.trim())
  .filter(Boolean);

const kind = classify(branch);
console.log(`Branch "${branch}" (${kind.kind}) changed ${files.length} file(s) against ${base}.`);

const bad = violations(branch, files);
if (bad.length === 0) {
  console.log('Ownership check passed.');
  process.exit(0);
}

console.error(`\nOwnership check FAILED: ${bad.length} file(s) are outside what "${branch}" may edit:\n`);
bad.forEach((f) => console.error(`  - ${f}`));
if (kind.kind === 'module') console.error(`\nA ${branch} branch may only edit:\n  ${moduleFolders(kind.slug).join('\n  ')}`);
else if (kind.kind === 'other') console.error('\nUse module/<slug>, base/<name>, fix/<topic> or core-change/<topic> branch names (see CONTRIBUTING.md).');
console.error('\nNeed a change outside your folders? Open a `core-change` issue instead (CLAUDE.md rule 1).');
process.exit(1);
