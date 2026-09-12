'use strict';

// Read-only documentation QA. Does not import application code or run tests.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const docRoot = path.join(root, 'docs/qa/rc0');
const names = ['README.md', 'STP.md', 'STD.md', 'STR.md', 'UNIT_TEST_INVENTORY.md', 'TRACEABILITY_AND_FINDINGS.md'];
const docs = Object.fromEntries(names.map(name => [name, fs.readFileSync(path.join(docRoot, name), 'utf8')]));
const manifest = JSON.parse(fs.readFileSync(path.join(docRoot, 'EVIDENCE_MANIFEST.json'), 'utf8'));
const evidenceRoot = path.join(root, manifest.evidenceRootRelativeToRepository);
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const linkIssues = [];
let localLinks = 0;
for (const name of names) {
  for (const match of docs[name].matchAll(/\[[^\]\n]+\]\(([^)\n]+)\)/g)) {
    const target = match[1];
    if (/^[a-z]+:\/\//i.test(target) || target.startsWith('#')) continue;
    const [relative, anchor] = target.split('#');
    const resolved = path.resolve(docRoot, decodeURIComponent(relative));
    localLinks++;
    if (!fs.existsSync(resolved)) { linkIssues.push({name, target, problem: 'missing'}); continue; }
    if (anchor && /^L\d+$/.test(anchor)) {
      const line = Number(anchor.slice(1));
      const length = fs.readFileSync(resolved, 'utf8').split(/\r?\n/).length;
      if (line < 1 || line > length) linkIssues.push({name, target, problem: 'line outside file'});
    }
  }
}
assert.deepEqual(linkIssues, [], 'Local document link targets must exist.');
assert.equal(manifest.files.length, 10);
for (const entry of manifest.files) {
  const bytes = fs.readFileSync(path.join(evidenceRoot, entry.path));
  assert.equal(bytes.length, entry.bytes, entry.id + ' byte length');
  assert.equal(sha256(bytes), entry.sha256, entry.id + ' hash');
}
const original = JSON.parse(fs.readFileSync(path.join(evidenceRoot, 'snapshot-02/source/rc0-manifest.json'), 'utf8'));
assert.equal(original.files.length, 29);
assert.equal(original.tests.length, 10);
for (const entry of original.files) {
  assert.equal(sha256(fs.readFileSync(path.join(root, entry.path))), entry.sha256, entry.path + ' unchanged source');
}
assert.equal(sha256(fs.readFileSync(path.join(root, 'docker-compose.yml'))), original.composeSha256, 'User Compose change preserved.');
const result = JSON.parse(fs.readFileSync(path.join(evidenceRoot, 'unit-result.json'), 'utf8'));
assert.equal(result.revision, manifest.testedRevision);
assert.equal(result.tests, 46);
assert.equal(result.passes, 46);
assert.equal(result.failures, 0);
assert.equal(result.pending, 0);
assert.equal(result.exitCode, 0);
assert.equal(result.exited, true);
assert.deepEqual(result.networkOrProcessAttempts, []);
const log = fs.readFileSync(path.join(evidenceRoot, 'unit-output.log'), 'utf8');
const titles = Array.from(log.matchAll(/^\s*✔ (.+)$/gm), m => m[1].trim());
const unitRows = docs['UNIT_TEST_INVENTORY.md'].split(/\r?\n/).filter(line => /^\| UT-\d{3} \|/.test(line));
assert.equal(unitRows.length, 46);
assert.equal(titles.length, 46);
for (let index = 0; index < unitRows.length; index++) {
  const cells = unitRows[index].split('|').map(value => value.trim());
  assert.equal(cells[1], 'UT-' + String(index + 1).padStart(3, '0'));
  assert.equal(cells[3], titles[index]);
  assert.equal(cells[5], 'PASS');
}
const futureIds = Array.from(docs['STD.md'].matchAll(/^## ((?:SYS|REL)-\d{2}) /gm), m => m[1]);
assert.deepEqual(futureIds, ['SYS-01', 'SYS-02', 'SYS-03', 'SYS-04', 'SYS-05', 'SYS-06', 'SYS-07', 'SYS-08', 'REL-01', 'REL-02', 'REL-03', 'REL-04']);
for (const section of docs['STD.md'].split(/^## (?=(?:SYS|REL)-\d{2})/m).slice(1)) assert(section.includes('NOT_RUN'));
const rqRows = docs['TRACEABILITY_AND_FINDINGS.md'].split(/\r?\n/).filter(line => /^\| RQ-/.test(line));
const observations = Array.from(docs['TRACEABILITY_AND_FINDINGS.md'].matchAll(/^## (OBS-\d{2}) /gm), m => m[1]);
assert.equal(rqRows.length, 16);
assert.deepEqual(observations, Array.from({length: 8}, (_, index) => 'OBS-' + String(index + 1).padStart(2, '0')));
console.log(JSON.stringify({check: 'DOCUMENTATION_ONLY', documents: names.length, localLinkTargetsChecked: localLinks, linkIssues, originalEvidenceHashesMatched: 10, sourceHashesMatched: 29, composeUnchanged: true, unitCasesMatchedToOriginalLog: 46, futureScenarioFamilies: 12, traceabilityRows: 16, sourceObservations: 8, applicationTestsRun: false, servicesStarted: false, result: 'PASS'}, null, 2));
