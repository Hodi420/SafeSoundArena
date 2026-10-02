'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { openLedger } = require('../journalStore');
const { ArenaCreditService } = require('../arenaCreditService');
const policy = require('../annual-token-policy.json');
const now = Date.parse('2027-06-01T10:00:00Z');

function location(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'arena-ledger-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return path.join(directory, 'ledger.jsonl');
}

test('durable replay preserves balance, fixed lock and retry receipts', t => {
  const journalPath = location(t);
  let opened = openLedger({ journalPath, clock: () => now });
  opened.ledger.createAccount({ id: 'alice', kind: 'personal' }, 'alice');
  opened.ledger.createAnnualSeries({ year: 2027 }, 'admin');
  opened.ledger.mint('alice', '100000', 'admin', { seriesId: 'ARC-2027' });
  opened.ledger.applyJailtime({ caseId: 'case-1', accountId: 'alice', subject: 'alice', seriesId: 'ARC-2027',
    percent: 25, endsAt: now + 3600000, reason: 'Reviewed violation', evidenceRef: 'proof:1' }, 'admin');
  const receipt = opened.ledger.withdraw('alice', '75000', 'alice', { seriesId: 'ARC-2027', requestId: 'withdraw-1' });
  opened.close();
  opened = openLedger({ journalPath, clock: () => now });
  try {
    assert.equal(opened.ledger.getBalance('alice', 'ARC-2027'), '0');
    assert.equal(opened.ledger.getBalanceSummary('alice', 'ARC-2027').lockedAtomic, '25000');
    assert.deepEqual(opened.ledger.withdraw('alice', '75000', 'alice', { seriesId: 'ARC-2027', requestId: 'withdraw-1' }), receipt);
    assert.equal(fs.readFileSync(journalPath, 'utf8').trim().split('\n').length, 6);
  } finally { opened.close(); }
});

test('only one writer may open a journal', t => {
  const journalPath = location(t);
  const opened = openLedger({ journalPath });
  try { assert.throws(() => openLedger({ journalPath }), /EEXIST/); }
  finally { opened.close(); }
});

test('a truncated financial journal is rejected without deleting evidence', t => {
  const journalPath = location(t);
  const opened = openLedger({ journalPath });
  opened.close();
  fs.appendFileSync(journalPath, '{"sequence":1');
  const before = fs.readFileSync(journalPath, 'utf8');
  assert.throws(() => openLedger({ journalPath }), /Incomplete journal/);
  assert.equal(fs.readFileSync(journalPath, 'utf8'), before);
  assert.equal(fs.existsSync(`${journalPath}.lock`), false);
});

test('changing policy on an existing journal fails rather than resetting balances', t => {
  const journalPath = location(t);
  const opened = openLedger({ journalPath });
  opened.close();
  assert.throws(() => openLedger({ journalPath, policy: { ...policy, allowPersonalTransfers: true } }), /policy mismatch/);
});

test('a journal write failure poisons the instance before balances can be used', () => {
  const ledger = new ArenaCreditService({ clock: () => now, appendEvent: () => { throw new Error('Disk full'); } });
  assert.throws(() => ledger.createAccount({ id: 'alice', kind: 'personal' }, 'alice'), /Disk full/);
  assert.throws(() => ledger.getTransactions(), /reopen and verify/);
  assert.throws(() => ledger.createAccount({ id: 'bob', kind: 'personal' }, 'bob'), /reopen and verify/);
});

test('a non-synchronous persistence callback fails closed', () => {
  const ledger = new ArenaCreditService({ clock: () => now, appendEvent: () => Promise.resolve() });
  assert.throws(() => ledger.createAccount({ id: 'alice', kind: 'personal' }, 'alice'), /synchronous/);
  assert.throws(() => ledger.getTransactions(), /reopen and verify/);
});
