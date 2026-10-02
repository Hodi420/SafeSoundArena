'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ArenaCreditService } = require('./arenaCreditService');
const defaults = require('./annual-token-policy.json');
const { canonical, validatePolicy } = require('./annualPolicy');

// Local, single-writer simulation storage. A stale lock is an operator-recovery
// condition; never silently break a lock or truncate a damaged financial journal.
function openLedger({ journalPath, policy = defaults, clock = Date.now }) {
  if (typeof journalPath !== 'string' || !path.isAbsolute(journalPath)) throw new Error('Absolute journalPath is required');
  const configured = validatePolicy(policy);
  fs.mkdirSync(path.dirname(journalPath), { recursive: true, mode: 0o700 });
  const lockPath = `${journalPath}.lock`;
  const lock = fs.openSync(lockPath, 'wx', 0o600);
  let fd;
  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    if (fd !== undefined) fs.closeSync(fd);
    fs.closeSync(lock);
    fs.unlinkSync(lockPath);
  }
  try {
    fs.writeSync(lock, `${process.pid}\n`);
    if (!fs.existsSync(journalPath)) {
      const created = fs.openSync(journalPath, 'wx', 0o600);
      try {
        fs.writeFileSync(created, `${canonical({ schemaVersion: 1, type: 'policy', policy: configured })}\n`);
        fs.fsyncSync(created);
      } finally { fs.closeSync(created); }
      const directory = fs.openSync(path.dirname(journalPath), 'r');
      try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
    }
    if (fs.lstatSync(journalPath).isSymbolicLink()) throw new Error('Journal must not be a symbolic link');
    const text = fs.readFileSync(journalPath, 'utf8');
    if (!text.endsWith('\n')) throw new Error('Incomplete journal; recovery is required');
    const rows = text.slice(0, -1).split('\n').map(line => JSON.parse(line));
    const header = rows.shift();
    if (header.type !== 'policy' || header.schemaVersion !== 1 || canonical(header.policy) !== canonical(configured)) {
      throw new Error('Journal policy mismatch');
    }
    fd = fs.openSync(journalPath, fs.constants.O_APPEND | fs.constants.O_WRONLY | (fs.constants.O_NOFOLLOW || 0));
    const appendEvent = event => {
      if (closed) throw new Error('Journal is closed');
      const data = Buffer.from(`${canonical(event)}\n`, 'utf8');
      if (fs.writeSync(fd, data) !== data.length) throw new Error('Incomplete journal write');
      fs.fsyncSync(fd);
    };
    const ledger = ArenaCreditService.restore({ schemaVersion: 1, policy: header.policy, events: rows }, { policy: configured, clock, appendEvent });
    return { ledger, close };
  } catch (error) {
    close();
    throw error;
  }
}

module.exports = { openLedger };
