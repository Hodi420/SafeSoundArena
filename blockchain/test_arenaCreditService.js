'use strict';

// Reproducible smoke example only. No real balances or network calls.
const assert = require('node:assert/strict');
const { ArenaCreditService } = require('./arenaCreditService');
const now = Date.parse('2027-06-01T10:00:00Z');
const arena = new ArenaCreditService({ clock: () => now });
arena.createAccount({ id: 'alice', kind: 'personal' }, 'alice');
arena.createAccount({ id: 'shop', kind: 'business' }, 'merchant');
arena.approveBusiness('shop', true, 'admin');
arena.createAnnualSeries({ year: 2027 }, 'admin');
arena.mint('alice', '100000', 'admin', { seriesId: 'ARC-2027' });
arena.reserve({ reservationId: 'order-1', from: 'alice', to: 'shop', seriesId: 'ARC-2027',
  amountAtomic: '20000', endsAt: now + 3600000 }, 'alice');
arena.applyJailtime({ caseId: 'case-1', accountId: 'alice', subject: 'alice', seriesId: 'ARC-2027',
  percent: 25, endsAt: now + 86400000, reason: 'Reviewed simulation decision', evidenceRef: 'proof:demo' }, 'admin');
const before = arena.getBalanceSummary('alice', 'ARC-2027');
assert.equal(before.availableAtomic, '60000');
arena.withdraw('alice', '60000', 'alice', { seriesId: 'ARC-2027', requestId: 'demo-withdrawal' });
assert.throws(() => arena.withdraw('alice', '1', 'alice', { seriesId: 'ARC-2027' }), /unlocked balance/);
console.log(JSON.stringify({ mode: 'simulation', beforeWithdrawal: before,
  afterWithdrawal: arena.getBalanceSummary('alice', 'ARC-2027'),
  annualStats: arena.getAnnualStats('ARC-2027'), verified: true }, null, 2));
