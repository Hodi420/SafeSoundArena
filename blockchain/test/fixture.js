'use strict';

const { ArenaCreditService } = require('../arenaCreditService');

function fixture(options = {}) {
  let now = Date.parse('2027-06-01T10:00:00Z');
  const ledger = new ArenaCreditService({ ...options, clock: () => now });
  ledger.createAccount({ id: 'alice', kind: 'personal' }, 'alice');
  ledger.createAccount({ id: 'bob', kind: 'personal' }, 'bob');
  ledger.createAccount({ id: 'shop', kind: 'business' }, 'bob');
  ledger.approveBusiness('shop', true, 'admin');
  ledger.createAccount({ id: 'business', kind: 'business' }, 'alice');
  ledger.approveBusiness('business', true, 'admin');
  ledger.createAccount({ id: 'operations', kind: 'subaccount', parentId: 'business' }, 'alice');
  ledger.createAnnualSeries({ year: 2027 }, 'admin');
  ledger.mint('alice', '100000', 'admin', { seriesId: 'ARC-2027' });
  return { ledger, get now() { return now; }, setNow(value) { now = value; },
    hold(overrides = {}) {
      return ledger.applyJailtime({ caseId: 'case-1', accountId: 'alice', subject: 'alice', seriesId: 'ARC-2027',
        percent: 25, endsAt: now + 86400000, reason: 'Verified policy violation', evidenceRef: 'proof:123', ...overrides }, 'admin');
    },
    reserve(overrides = {}) {
      return ledger.reserve({ reservationId: 'order-1', from: 'alice', to: 'shop', seriesId: 'ARC-2027',
        amountAtomic: '20000', endsAt: now + 3600000, ...overrides }, 'alice');
    }
  };
}

module.exports = { fixture };
