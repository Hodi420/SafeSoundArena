'use strict';

// Read-only, local publication-boundary check. No application imports or network.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const base = 'e33cfd88d127c5e7cd1a7266295aa924b9935b3b';
const main = '28d0e67da2c118c0c4f87d2c2e1a42169c516b63';
const allowed = [
  '.codex/config.toml', 'PROJECT_STATUS.md', 'docker-compose.yml',
  'docs/README.md', 'docs/OPERATIONAL_HANDOFF.md', 'docs/PROJECT_FILE_MAP.md',
  'docs/MINI_PC_READINESS.md', 'docs/GIT_MCP_HANDOFF.md',
  'docs/qa/rc0/README.md', 'docs/qa/rc0/STP.md', 'docs/qa/rc0/STD.md',
  'docs/qa/rc0/STR.md', 'docs/qa/rc0/UNIT_TEST_INVENTORY.md',
  'docs/qa/rc0/TRACEABILITY_AND_FINDINGS.md', 'docs/qa/rc0/EVIDENCE_MANIFEST.json',
].sort();
const staged = process.argv.includes('--staged');
const git = (...args) => cp.execFileSync('git', ['-c', 'core.quotepath=false', ...args], { cwd: root, timeout: 10000, maxBuffer: 20 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
const list = (...args) => git(...args).toString('utf8').split('\0').filter(Boolean).sort();
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(git('rev-parse', 'HEAD').toString().trim(), base, 'Unexpected HEAD; re-review the boundary.');
assert.equal(git('rev-parse', 'origin/codex/phase-1-proof-layer').toString().trim(), base, 'Unexpected upstream; re-review.');
assert.equal(git('rev-parse', 'origin/main').toString().trim(), main, 'Unexpected main ref; re-review.');
assert.equal(git('diff', '--name-only', '--diff-filter=U').toString().trim(), '', 'Unmerged paths.');
const changed = [...new Set([...list('diff', '--name-only', '-z', 'HEAD'), ...list('ls-files', '--others', '--exclude-standard', '-z')])].sort();
assert.deepEqual(changed, allowed, 'Changed/untracked file set must exactly match the reviewed allowlist.');
if (staged) {
  assert.deepEqual(list('diff', '--cached', '--name-only', '-z'), allowed, 'Staged allowlist mismatch.');
  assert.equal(git('diff', '--name-only').toString().trim(), '', 'Unstaged tracked edits remain.');
}
const patterns = [
  ['private_key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['github_token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],
  ['openai_token', /\bsk-(?:(?:proj|svcacct)-)?[A-Za-z0-9_-]{32,}\b/],
  ['aws_access_key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['jwt_literal', /\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\b/],
  ['url_credentials', /https?:\/\/[^\s/@:]+:[^\s/@]+@/],
  ['literal_secret_assignment', /(?:api[_-]?key|access[_-]?token|admin[_-]?token|client[_-]?secret|password)\s*[=:]\s*["'][^"'\r\n]{12,}["']/i],
  ['conflict_marker', /^(?:<<<<<<< |>>>>>>> |=======$)/m],
];
const issues = [];
const manifest = [];
for (const name of allowed) {
  const filename = path.resolve(root, name);
  assert(filename.startsWith(root + path.sep));
  assert(fs.lstatSync(filename).isFile(), name + ' must be a regular file.');
  const bytes = staged ? git('show', ':' + name) : fs.readFileSync(filename);
  assert(bytes.length < 1024 * 1024, name + ' exceeds publication size bound.');
  assert(!bytes.includes(0), name + ' contains binary data.');
  const content = bytes.toString('utf8');
  for (const [rule, regex] of patterns) {
    const match = regex.exec(content);
    if (match) issues.push({ path: name, rule, line: content.slice(0, match.index).split('\n').length });
  }
  manifest.push({ path: name, bytes: bytes.length, sha256: hash(bytes) });
}
const linkIssues = [];
let linkCount = 0;
// Restrict to authored handoff docs; older indexes contain acknowledged historical links.
for (const name of ['docs/PROJECT_FILE_MAP.md', 'docs/MINI_PC_READINESS.md', 'docs/GIT_MCP_HANDOFF.md']) {
  const content = fs.readFileSync(path.join(root, name), 'utf8');
  for (const match of content.matchAll(/\[[^\]\n]+\]\(([^)\n]+)\)/g)) {
    const target = match[1];
    if (/^[a-z]+:\/\//i.test(target) || target.startsWith('#')) continue;
    const [relative, anchor] = target.split('#');
    const filename = path.resolve(root, path.dirname(name), decodeURIComponent(relative));
    linkCount++;
    if (!fs.existsSync(filename)) { linkIssues.push({ path: name, target, issue: 'missing' }); continue; }
    if (anchor && /^L\d+$/.test(anchor)) {
      const lines = fs.readFileSync(filename, 'utf8').split(/\r?\n/).length;
      if (+anchor.slice(1) > lines || +anchor.slice(1) < 1) linkIssues.push({ path: name, target, issue: 'line_range' });
    }
  }
}
const branchPatch = git('diff', '--binary', '--full-index', '--no-ext-diff', '--no-textconv', '--no-renames', main + '...' + base, '--');
const stagedPatch = staged ? git('diff', '--cached', '--binary', '--full-index', '--no-ext-diff', '--no-textconv', '--no-renames', base, '--') : null;
console.log(JSON.stringify({ check: staged ? 'STAGED_PUBLICATION_BOUNDARY' : 'WORKTREE_PUBLICATION_BOUNDARY', base, main, reviewedPaths: allowed.length, issues, localLinksChecked: linkCount, linkIssues, existingBranchPatchSha256: hash(branchPatch), ...(stagedPatch ? { outgoingPatchSha256: hash(stagedPatch) } : {}), manifest, applicationTestsRun: false, historySecretAudit: false, result: issues.length || linkIssues.length ? 'REVIEW_REQUIRED' : 'PASS_BOUNDED' }, null, 2));
assert.deepEqual(issues, [], 'Publication rules require review (values are not printed).');
assert.deepEqual(linkIssues, [], 'Document links must resolve.');
