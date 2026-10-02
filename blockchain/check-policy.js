'use strict';

const { validatePolicy, annualWindow, hash } = require('./annualPolicy');
const policy = validatePolicy(require('./annual-token-policy.json'));
const year = Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: policy.timezone }).format(Date.now()));
const window = annualWindow(year, policy.timezone);
console.log(JSON.stringify({ valid: true, policyVersion: policy.version, policyHash: hash(policy),
  mode: policy.mode, mainnetEnabled: policy.mainnetEnabled, currentYear: year,
  startsAt: new Date(window.startsAt).toISOString(), expiresAt: new Date(window.expiresAt).toISOString(),
  annualSupplyCapAtomic: policy.annualSupplyCapAtomic }, null, 2));
