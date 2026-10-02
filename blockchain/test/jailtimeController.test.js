'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./fixture');
const { createJailtimeWalletController } = require('../../backend/jailtime-events');

function adapter(f, overrides = {}) {
  return createJailtimeWalletController({ ledger: f.ledger,
    resolvePrincipal: context => { if (!context.sessionUser) throw new Error('Unauthenticated'); return context.sessionUser; },
    loadApprovedDecision: id => ({ id, status: 'approved', walletScope: 'account', accountId: 'alice', subject: 'alice',
      seriesId: 'ARC-2027', percent: 25, endsAt: f.now + 3600000, reason: 'Reviewed violation', evidenceRef: 'proof:1' }),
    ...overrides });
}

test('controller requires host authentication and authoritative decision adapters', () => {
  assert.throws(() => createJailtimeWalletController({ ledger: fixture().ledger }), /identity resolver/);
});

test('untrusted room profiles cannot change a wallet lock', async () => {
  const f = fixture();
  await assert.rejects(adapter(f).applyDecision({ profile: { userId: 'admin' } }, 'case-1'), /Unauthenticated/);
  assert.equal(f.ledger.getBalance('alice', 'ARC-2027'), '100000');
});

test('approved account-scoped decisions apply exactly once', async () => {
  const f = fixture();
  const controller = adapter(f);
  const first = await controller.applyDecision({ sessionUser: 'admin' }, 'case-1');
  const second = await controller.applyDecision({ sessionUser: 'admin' }, 'case-1');
  assert.deepEqual(first, second);
  assert.equal(f.ledger.getBalanceSummary('alice', 'ARC-2027').lockedAtomic, '25000');
});

test('unapproved or actor-only decisions cannot freeze a shared account', async () => {
  const f = fixture();
  const controller = adapter(f, { loadApprovedDecision: id => ({ id, status: 'approved', walletScope: 'actor' }) });
  await assert.rejects(controller.applyDecision({ sessionUser: 'admin' }, 'case-1'), /account-scoped/);
  assert.equal(f.ledger.getBalance('alice', 'ARC-2027'), '100000');
});

test('a bot identity cannot apply even an approved monetary decision', async () => {
  const f = fixture();
  await assert.rejects(adapter(f).applyDecision({ sessionUser: 'mshix' }, 'case-1'), /Unauthorized governance/);
});

test('wallet reads and appeals use the resolved principal', async () => {
  const f = fixture();
  const controller = adapter(f);
  await controller.applyDecision({ sessionUser: 'admin' }, 'case-1');
  await assert.rejects(controller.balance({ sessionUser: 'bob' }, 'alice', 'ARC-2027'), /Unauthorized account/);
  await controller.appeal({ sessionUser: 'alice' }, { caseId: 'case-1', reason: 'Please review', requestId: 'appeal-1' });
  assert.equal(f.ledger.getJailtimeCase('case-1').appeal.by, 'alice');
});

test('release loads a separately approved decision', async () => {
  const f = fixture();
  f.hold();
  const controller = adapter(f, { loadApprovedDecision: id => ({ id, status: 'approved', type: 'release', caseId: 'case-1', reason: 'Appeal accepted' }) });
  await controller.releaseDecision({ sessionUser: 'admin' }, 'release-1');
  assert.equal(f.ledger.getBalance('alice', 'ARC-2027'), '100000');
});
