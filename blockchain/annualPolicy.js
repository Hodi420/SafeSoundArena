'use strict';

const { createHash } = require('node:crypto');

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
function hash(value) { return createHash('sha256').update(canonical(value)).digest('hex'); }
function units(value, { zero = false } = {}) {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) throw new Error('Amount must be a safe integer');
  if (!['string', 'number', 'bigint'].includes(typeof value) || !/^\d+$/.test(String(value))) throw new Error('Amount must be an unsigned integer in atomic units');
  const amount = BigInt(value);
  if (amount < (zero ? 0n : 1n)) throw new Error('Amount must be positive');
  return amount;
}
function identifier(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/.test(value)) throw new Error('Invalid identifier');
  return value;
}
function timestamp(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid timestamp');
  return value;
}
function localYearStart(year, timezone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  });
  const candidate = Date.UTC(year, 0, 1);
  const parts = Object.fromEntries(formatter.formatToParts(candidate).map(part => [part.type, part.value]));
  const represented = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  const start = candidate - (represented - candidate);
  const check = Object.fromEntries(formatter.formatToParts(start).map(part => [part.type, part.value]));
  if (+check.year !== year || check.month !== '01' || check.day !== '01' || check.hour !== '00') throw new Error('Unable to resolve annual boundary');
  return start;
}
function annualWindow(year, timezone) {
  if (!Number.isInteger(year) || year < 2020 || year > 2100) throw new Error('Year must be between 2020 and 2100');
  return { startsAt: localYearStart(year, timezone), expiresAt: localYearStart(year + 1, timezone) };
}
function validatePolicy(input) {
  const policy = structuredClone(input);
  if (policy.schemaVersion !== 1 || policy.mode !== 'simulation' || policy.mainnetEnabled !== false ||
      policy.externalAssetsEnabled !== false || policy.rolloverEnabled !== false) throw new Error('Only the isolated simulation policy is supported');
  identifier(policy.owner);
  if (typeof policy.version !== 'string' || !policy.version) throw new Error('Policy version is required');
  if (policy.timezone !== 'Asia/Jerusalem') throw new Error('Annual policy must use Asia/Jerusalem');
  policy.annualSupplyCapAtomic = units(policy.annualSupplyCapAtomic).toString();
  if (policy.atomicUnitsPerAs !== '100') throw new Error('One As must equal 100 atomic units');
  const expected = { as: '100', sestertius: '400', denarius: '1600', aureus: '40000' };
  if (canonical(policy.denominationsAtomic) !== canonical(expected)) throw new Error('Invalid Roman denominations');
  if (typeof policy.allowPersonalTransfers !== 'boolean') throw new Error('Transfer policy is required');
  if (!Array.isArray(policy.jailtimePercentages) || !policy.jailtimePercentages.length ||
      policy.jailtimePercentages.some(p => !Number.isInteger(p) || p < 1 || p > 100)) throw new Error('Invalid Jailtime percentages');
  for (const field of ['maxJailtimeMs', 'settlementCutoffMs']) {
    if (!Number.isSafeInteger(policy[field]) || policy[field] < 1) throw new Error(`Invalid ${field}`);
  }
  return policy;
}
module.exports = { canonical, hash, units, identifier, timestamp, annualWindow, validatePolicy };
