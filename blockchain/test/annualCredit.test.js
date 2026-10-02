'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./fixture');
const { ArenaCreditService } = require('../arenaCreditService');
const { annualWindow, validatePolicy, units } = require('../annualPolicy');
const policy = require('../annual-token-policy.json');
const opts = { seriesId: 'ARC-2027' };

test('annual boundaries use Jerusalem midnight and preserve Roman ratios', () => {
  assert.equal(new Date(annualWindow(2027, policy.timezone).startsAt).toISOString(), '2026-12-31T22:00:00.000Z');
  assert.equal(new Date(annualWindow(2027, policy.timezone).expiresAt).toISOString(), '2027-12-31T22:00:00.000Z');
  assert.equal(BigInt(policy.denominationsAtomic.aureus), 25n * BigInt(policy.denominationsAtomic.denarius));
  assert.equal(BigInt(policy.denominationsAtomic.denarius), 4n * BigInt(policy.denominationsAtomic.sestertius));
});

test('live networks, external assets and rollover fail closed', () => {
  for (const field of ['mainnetEnabled', 'externalAssetsEnabled', 'rolloverEnabled']) {
    assert.throws(() => validatePolicy({ ...policy, [field]: true }), /isolated simulation/);
  }
  assert.throws(() => validatePolicy({ ...policy, atomicUnitsPerAs: '1' }), /100 atomic/);
});

test('no issuance before the first instant of the series', () => {
  let now = annualWindow(2027, policy.timezone).startsAt - 1;
  const ledger = new ArenaCreditService({ clock: () => now });
  ledger.createAccount({ id: 'alice', kind: 'personal' }, 'alice');
  ledger.createAnnualSeries({ year: 2027 }, 'admin');
  assert.throws(() => ledger.mint('alice', '100', 'admin', opts), /not active/);
  now += 1;
  ledger.mint('alice', '100', 'admin', opts);
  assert.equal(ledger.getBalance('alice', 'ARC-2027'), '100');
});

test('expiry blocks all outgoing routes without a timer or deleting history', () => {
  const f = fixture();
  const previous = f.ledger.getTransactions();
  f.setNow(annualWindow(2027, policy.timezone).expiresAt);
  assert.equal(f.ledger.getBalance('alice', 'ARC-2027'), '0');
  assert.equal(f.ledger.getBalanceSummary('alice', 'ARC-2027').expiredAtomic, '100000');
  for (const operation of [
    () => f.ledger.withdraw('alice', '1', 'alice', opts),
    () => f.ledger.burn('alice', '1', 'alice', opts),
    () => f.ledger.transfer('alice', 'shop', '1', { ...opts, caller: 'alice', action: 'payment' }),
    () => f.ledger.mint('alice', '1', 'admin', opts), () => f.reserve()
  ]) assert.throws(operation, /not active/);
  assert.deepEqual(f.ledger.getTransactions(), previous);
});

test('annual series do not convert into another year', () => {
  const { ledger } = fixture();
  ledger.createAnnualSeries({ year: 2028 }, 'admin');
  assert.throws(() => ledger.transfer('alice', 'shop', '100', { ...opts, caller: 'alice', action: 'payment', destinationSeriesId: 'ARC-2028' }), /Cross-year/);
  assert.throws(() => ledger.mint('alice', '100', 'admin', { seriesId: 'ARC-2028' }), /not active/);
});

test('burning and withdrawals never reopen the annual issuance cap', () => {
  const { ledger } = fixture({ policy: { ...policy, annualSupplyCapAtomic: '100000' } });
  ledger.burn('alice', '1000', 'alice', opts);
  ledger.withdraw('alice', '1000', 'alice', opts);
  assert.throws(() => ledger.mint('alice', '1', 'admin', opts), /issuance cap/);
  const stats = ledger.getAnnualStats('ARC-2027');
  assert.equal(stats.issuedAtomic, '100000');
  assert.equal(stats.outstandingAtomic, '98000');
});

test('governance may issue but has no implicit right to debit personal funds', () => {
  const { ledger } = fixture();
  assert.throws(() => ledger.mint('alice', '1', 'alice', opts), /Unauthorized governance/);
  assert.throws(() => ledger.withdraw('alice', '1', 'admin', opts), /Unauthorized account/);
  assert.throws(() => ledger.burn('alice', '1', 'admin', opts), /Unauthorized account/);
});

test('zero, negative, fractional, non-finite and unsafe amounts cannot change the ledger', () => {
  const { ledger } = fixture();
  const before = ledger.exportSnapshot();
  for (const amount of [0, -1, 0.25, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1e3', '-1', '1.1', {}, null]) {
    assert.throws(() => ledger.withdraw('alice', amount, 'alice', opts));
  }
  assert.deepEqual(ledger.exportSnapshot(), before);
  assert.equal(units('9007199254740993000'), 9007199254740993000n);
});

test('zero supply, duplicate years and oversized supply are rejected', () => {
  const { ledger } = fixture();
  assert.throws(() => ledger.createAnnualSeries({ year: 2028, capAtomic: '0' }, 'admin'), /positive/);
  assert.throws(() => ledger.createAnnualSeries({ year: 2027 }, 'admin'), /duplicate/);
  assert.throws(() => ledger.createAnnualSeries({ year: 2028, capAtomic: '100000001' }, 'admin'), /annual supply/);
});

test('25 percent lock excludes prior commitments and cannot drain through repeated withdrawals', () => {
  const f = fixture();
  f.reserve();
  f.hold();
  const summary = f.ledger.getBalanceSummary('alice', 'ARC-2027');
  assert.equal(summary.reservedAtomic, '20000');
  assert.equal(summary.lockedAtomic, '20000');
  assert.equal(summary.availableAtomic, '60000');
  for (let i = 0; i < 6; i++) f.ledger.withdraw('alice', '10000', 'alice', opts);
  assert.throws(() => f.ledger.withdraw('alice', '1', 'alice', opts), /unlocked balance/);
  assert.equal(f.ledger.getBalanceSummary('alice', 'ARC-2027').lockedAtomic, '20000');
});

test('the same lock protects payment, burn, reservation and child allocation routes', () => {
  const f = fixture();
  f.hold({ percent: 100 });
  f.ledger.createAccount({ id: 'personal-child', kind: 'subaccount', parentId: 'alice' }, 'alice');
  for (const operation of [
    () => f.ledger.transfer('alice', 'shop', '1', { ...opts, caller: 'alice', action: 'payment' }),
    () => f.ledger.transfer('alice', 'personal-child', '1', { ...opts, caller: 'alice', action: 'allocation' }),
    () => f.ledger.burn('alice', '1', 'alice', opts), () => f.reserve({ amountAtomic: '1' })
  ]) assert.throws(operation, /unlocked balance/);
  assert.throws(() => f.ledger.execute({ actor: 'alice', type: 'bridge', requestId: 'bridge-1', data: {} }), /Unsupported command/);
});

test('incoming credits extend the fixed lock and rounding is cumulative', () => {
  const f = fixture();
  f.hold();
  f.ledger.withdraw('alice', '75000', 'alice', opts);
  f.ledger.mint('alice', '4000', 'admin', opts);
  assert.equal(f.ledger.getBalanceSummary('alice', 'ARC-2027').lockedAtomic, '26000');
  assert.equal(f.ledger.getBalance('alice', 'ARC-2027'), '3000');
  f.ledger.mint('alice', '1', 'admin', opts);
  f.ledger.mint('alice', '1', 'admin', opts);
  assert.equal(f.ledger.getBalanceSummary('alice', 'ARC-2027').lockedAtomic, '26001');
});

test('overlapping cases use the maximum hold without adding percentages', () => {
  const f = fixture();
  f.hold();
  f.hold({ caseId: 'case-2', percent: 50 });
  f.hold({ caseId: 'case-3', percent: 10 });
  assert.equal(f.ledger.getBalanceSummary('alice', 'ARC-2027').lockedAtomic, '50000');
  f.ledger.releaseJailtime('case-2', 'Decision overturned', 'admin');
  assert.equal(f.ledger.getBalanceSummary('alice', 'ARC-2027').lockedAtomic, '25000');
});

test('automatic release does not require a scheduler', () => {
  const f = fixture();
  f.hold();
  f.setNow(f.now + 86400000);
  assert.equal(f.ledger.getBalance('alice', 'ARC-2027'), '100000');
  assert.equal(f.ledger.getJailtimeCase('case-1').status, 'ended');
});

test('release never revives expired tokens or implicitly locks the new year', () => {
  const f = fixture();
  const boundary = annualWindow(2027, policy.timezone).expiresAt;
  f.setNow(boundary - 3600000);
  f.hold({ endsAt: boundary + 3600000 });
  f.ledger.createAnnualSeries({ year: 2028 }, 'admin');
  f.setNow(boundary);
  f.ledger.releaseJailtime('case-1', 'Appeal accepted', 'admin');
  assert.equal(f.ledger.getBalance('alice', 'ARC-2027'), '0');
  f.ledger.mint('alice', '100', 'admin', { seriesId: 'ARC-2028' });
  assert.equal(f.ledger.getBalance('alice', 'ARC-2028'), '100');
});

test('Jailtime requires governance, evidence, a known subject and bounded duration', () => {
  const f = fixture();
  for (const data of [{ reason: '' }, { evidenceRef: '' }, { subject: 'stranger' }, { percent: 33 }, { endsAt: f.now + policy.maxJailtimeMs + 1 }]) {
    assert.throws(() => f.hold(data));
  }
  assert.throws(() => f.ledger.applyJailtime({ accountId: 'alice', subject: 'alice' }, 'mshix'), /Unauthorized governance/);
  assert.equal(f.ledger.getBalance('alice', 'ARC-2027'), '100000');
});

test('appeals are account scoped and successful appeals preserve original decisions', () => {
  const f = fixture();
  f.hold();
  assert.throws(() => f.ledger.appeal('case-1', 'Review', 'bob'), /Unauthorized account/);
  f.ledger.appeal('case-1', 'Evidence is incorrect', 'alice');
  f.ledger.releaseJailtime('case-1', 'Evidence reviewed', 'admin');
  assert.equal(f.ledger.getJailtimeCase('case-1').appeal.status, 'accepted');
  assert.equal(f.ledger.getTransactions().filter(e => e.command.type === 'applyJailtime').length, 1);
});

test('business owners inherit child access and revocation removes descendant access', () => {
  const { ledger } = fixture();
  ledger.mint('operations', '1000', 'admin', opts);
  ledger.grantRole({ accountId: 'business', member: 'bob', role: 'owner' }, 'alice');
  ledger.grantRole({ accountId: 'operations', member: 'bob', role: 'spender' }, 'alice');
  ledger.withdraw('operations', '100', 'bob', opts);
  ledger.revokeRole('business', 'bob', 'alice');
  assert.throws(() => ledger.withdraw('operations', '100', 'bob', opts), /Unauthorized account/);
  ledger.withdraw('operations', '100', 'alice', opts);
});

test('viewers cannot spend or grant permissions and last owners remain protected', () => {
  const { ledger } = fixture();
  ledger.grantRole({ accountId: 'business', member: 'bob', role: 'viewer' }, 'alice');
  assert.throws(() => ledger.withdraw('business', '1', 'bob', opts), /Unauthorized account/);
  assert.throws(() => ledger.grantRole({ accountId: 'business', member: 'bob', role: 'owner' }, 'bob'), /Unauthorized account/);
  assert.throws(() => ledger.revokeRole('business', 'alice', 'alice'), /last explicit owner/);
  assert.throws(() => ledger.grantRole({ accountId: 'business', member: 'bob', role: 'constructor' }, 'alice'), /Invalid account role/);
});

test('personal transfer bans survive routing through subaccounts', () => {
  const { ledger } = fixture();
  ledger.createAccount({ id: 'alice-child', kind: 'subaccount', parentId: 'alice' }, 'alice');
  ledger.createAccount({ id: 'bob-child', kind: 'subaccount', parentId: 'bob' }, 'bob');
  ledger.transfer('alice', 'alice-child', '1000', { ...opts, caller: 'alice', action: 'allocation' });
  assert.throws(() => ledger.transfer('alice-child', 'bob-child', '100', { ...opts, caller: 'alice' }), /Personal transfers/);
  assert.throws(() => ledger.transfer('alice', 'bob', '100', { ...opts, caller: 'alice' }), /Personal transfers/);
});

test('a self-created business cannot immediately accept payment', () => {
  const { ledger } = fixture();
  ledger.createAccount({ id: 'unapproved', kind: 'business' }, 'bob');
  assert.throws(() => ledger.transfer('alice', 'unapproved', '100', { ...opts, caller: 'alice', action: 'payment' }), /approved business/);
  assert.throws(() => ledger.approveBusiness('unapproved', true, 'bob'), /Unauthorized governance/);
  ledger.approveBusiness('unapproved', true, 'admin');
  ledger.transfer('alice', 'unapproved', '100', { ...opts, caller: 'alice', action: 'payment' });
});

test('rejecting a recipient leaves the source and journal unchanged', () => {
  const { ledger } = fixture();
  const before = ledger.exportSnapshot();
  assert.throws(() => ledger.transfer('alice', 'unknown', '100', { ...opts, caller: 'alice' }), /Unknown account/);
  assert.deepEqual(ledger.exportSnapshot(), before);
});

test('existing reserved commitments settle after a free-balance hold', () => {
  const f = fixture();
  f.reserve();
  f.hold({ percent: 100 });
  f.ledger.settle('order-1', 'alice');
  assert.equal(f.ledger.getBalance('shop', 'ARC-2027'), '20000');
  assert.equal(f.ledger.getBalance('alice', 'ARC-2027'), '0');
});

test('cancellation puts released funds under the same Jailtime percentage', () => {
  const f = fixture();
  f.reserve(); f.hold();
  f.ledger.withdraw('alice', '60000', 'alice', opts);
  f.ledger.cancelReservation('order-1', 'alice');
  assert.equal(f.ledger.getBalanceSummary('alice', 'ARC-2027').lockedAtomic, '25000');
  assert.equal(f.ledger.getBalance('alice', 'ARC-2027'), '15000');
});

test('reservation expiration cannot bypass a hold or double count its release', () => {
  const f = fixture();
  f.reserve(); f.hold();
  f.setNow(f.now + 3600000);
  assert.equal(f.ledger.getBalanceSummary('alice', 'ARC-2027').lockedAtomic, '25000');
  assert.equal(f.ledger.getBalanceSummary('alice', 'ARC-2027').lockedAtomic, '25000');
  f.ledger.withdraw('alice', '75000', 'alice', opts);
  assert.throws(() => f.ledger.withdraw('alice', '1', 'alice', opts), /unlocked balance/);
  assert.throws(() => f.ledger.settle('order-1', 'alice'), /not active/);
});

test('reservations cannot cross the annual settlement cutoff', () => {
  const f = fixture();
  const end = annualWindow(2027, policy.timezone).expiresAt;
  assert.throws(() => f.reserve({ endsAt: end }), /settlement deadline/);
  f.reserve({ endsAt: end - policy.settlementCutoffMs });
  f.setNow(end);
  assert.throws(() => f.ledger.settle('order-1', 'alice'), /not active/);
});

test('request IDs provide exactly-once effects and reject payload changes', () => {
  const { ledger } = fixture();
  const request = { ...opts, requestId: 'withdraw-1' };
  const receipt = ledger.withdraw('alice', '100', 'alice', request);
  assert.deepEqual(ledger.withdraw('alice', '100', 'alice', request), receipt);
  assert.equal(ledger.getBalance('alice', 'ARC-2027'), '99900');
  assert.throws(() => ledger.withdraw('alice', '101', 'alice', request), /reused/);
});

test('snapshot replay restores locks, reservations, ACLs and idempotency', () => {
  const f = fixture();
  f.reserve(); f.hold();
  const receipt = f.ledger.withdraw('alice', '100', 'alice', { ...opts, requestId: 'stable-withdrawal' });
  const restored = ArenaCreditService.restore(JSON.parse(JSON.stringify(f.ledger.exportSnapshot())), { clock: () => f.now });
  assert.deepEqual(restored.getBalanceSummary('alice', 'ARC-2027'), f.ledger.getBalanceSummary('alice', 'ARC-2027'));
  assert.deepEqual(restored.withdraw('alice', '100', 'alice', { ...opts, requestId: 'stable-withdrawal' }), receipt);
});

test('tampered, duplicated and reordered journal entries fail replay', () => {
  const f = fixture();
  const original = f.ledger.exportSnapshot();
  const tampered = structuredClone(original);
  tampered.events.at(-1).command.data.amountAtomic = '50000';
  assert.throws(() => ArenaCreditService.restore(tampered), /integrity/);
  const duplicated = structuredClone(original);
  duplicated.events.push(duplicated.events.at(-1));
  assert.throws(() => ArenaCreditService.restore(duplicated), /sequence/);
  const reordered = structuredClone(original);
  [reordered.events[0], reordered.events[1]] = [reordered.events[1], reordered.events[0]];
  assert.throws(() => ArenaCreditService.restore(reordered), /sequence/);
});

test('callers cannot mutate exported balances, policy or audit history', () => {
  const { ledger } = fixture();
  ledger.getPolicy().annualSupplyCapAtomic = '999999999999';
  ledger.getTransactions().at(-1).command.data.amountAtomic = '1';
  ledger.getBalanceSummary('alice', 'ARC-2027').availableAtomic = '0';
  assert.equal(ledger.getBalance('alice', 'ARC-2027'), '100000');
  assert.equal(ledger.getPolicy().annualSupplyCapAtomic, policy.annualSupplyCapAtomic);
});

test('a backwards clock cannot reopen an expired annual series', () => {
  const f = fixture();
  const june = f.now;
  f.setNow(annualWindow(2027, policy.timezone).expiresAt);
  assert.equal(f.ledger.getBalance('alice', 'ARC-2027'), '0');
  f.setNow(june + 1000);
  assert.throws(() => f.ledger.getBalance('alice', 'ARC-2027'), /clock moved backwards/);
  assert.throws(() => f.ledger.withdraw('alice', '1', 'alice', opts), /clock moved backwards/);
});

test('balance reads at the integration boundary enforce account membership', () => {
  const { ledger } = fixture();
  assert.throws(() => ledger.getBalanceSummary('alice', 'ARC-2027', 'bob'), /Unauthorized account/);
  assert.equal(ledger.getBalanceSummary('alice', 'ARC-2027', 'alice').availableAtomic, '100000');
});
