'use strict';

// Off-chain policy engine. The host authenticates caller identities; this module
// does not authenticate HTTP headers or execute external Pi/chain transfers.
const { randomUUID } = require('node:crypto');
const defaults = require('./annual-token-policy.json');
const { canonical, hash, units, identifier, timestamp, annualWindow, validatePolicy } = require('./annualPolicy');
const ROLES = { viewer: 1, spender: 2, owner: 3 };
const KINDS = new Set(['personal', 'business', 'subaccount', 'treasury', 'project']);
const GENESIS = '0'.repeat(64);
const ceilPercent = (amount, percent) => (amount * BigInt(percent) + 99n) / 100n;

class ArenaCreditService {
  #state;
  #events = [];
  #clock;
  #appendEvent;
  #failed = false;
  #policy;
  #policyHash;
  #observedAt = 0;

  constructor({ policy = defaults, clock = Date.now, appendEvent } = {}) {
    this.#policy = validatePolicy(policy);
    this.#policyHash = hash(this.#policy);
    this.#clock = clock;
    this.#appendEvent = appendEvent;
    this.#state = { accounts: new Map(), series: new Map(), reservations: new Map(), holds: new Map(), requests: new Map() };
  }
  #healthy() { if (this.#failed) throw new Error('Journal write failed; reopen and verify the ledger before use'); }
  #observe(now) {
    timestamp(now);
    if (now < this.#observedAt) throw new Error('Ledger clock moved backwards');
    this.#observedAt = now;
  }
  #account(state, id) {
    const account = state.accounts.get(identifier(id));
    if (!account) throw new Error('Unknown account');
    return account;
  }
  #role(state, id, actor) {
    let account = this.#account(state, id);
    let role = 0;
    while (account) {
      role = Math.max(role, ROLES[account.members.get(actor)] || 0);
      account = account.parentId ? state.accounts.get(account.parentId) : null;
    }
    return role;
  }
  #authorize(state, id, actor, role = 'spender') {
    if (this.#role(state, id, actor) < ROLES[role]) throw new Error('Unauthorized account action');
  }
  #governance(actor) { if (actor !== this.#policy.owner) throw new Error('Unauthorized governance action'); }
  #series(state, id, now, active = true) {
    const series = state.series.get(identifier(id));
    if (!series) throw new Error('Unknown annual series');
    if (active && (now < series.startsAt || now >= series.expiresAt)) throw new Error('Annual series is not active');
    return series;
  }
  #activeHolds(state, accountId, seriesId, now) {
    return [...state.holds.values()].filter(hold => hold.accountId === accountId && hold.seriesId === seriesId &&
      hold.releasedAt === null && now >= hold.startsAt && now < hold.endsAt);
  }
  #topUpHolds(state, accountId, seriesId, amount, now) {
    for (const hold of this.#activeHolds(state, accountId, seriesId, now)) {
      hold.basis += amount;
      hold.locked = ceilPercent(hold.basis, hold.percent);
    }
  }
  #advance(state, now) {
    for (const reservation of state.reservations.values()) {
      if (reservation.status !== 'reserved') continue;
      const series = state.series.get(reservation.seriesId);
      if (now >= series.expiresAt || now >= reservation.endsAt) {
        reservation.status = 'expired';
        if (now < series.expiresAt) this.#topUpHolds(state, reservation.from, series.id, reservation.amount, now);
      }
    }
  }
  #summary(state, accountId, seriesId, now) {
    this.#account(state, accountId);
    const series = this.#series(state, seriesId, now, false);
    const balance = series.balances.get(accountId) || 0n;
    const active = now >= series.startsAt && now < series.expiresAt;
    const reserved = active ? [...state.reservations.values()].filter(r => r.seriesId === seriesId &&
      r.from === accountId && r.status === 'reserved').reduce((sum, r) => sum + r.amount, 0n) : 0n;
    const eligible = balance - reserved;
    const locked = active ? this.#activeHolds(state, accountId, seriesId, now)
      .reduce((maximum, hold) => hold.locked > maximum ? hold.locked : maximum, 0n) : 0n;
    const cappedLock = locked > eligible ? eligible : locked;
    return {
      accountId, seriesId, status: now < series.startsAt ? 'scheduled' : active ? 'active' : 'expired',
      nominalAtomic: balance.toString(), availableAtomic: (active ? eligible - cappedLock : 0n).toString(),
      reservedAtomic: reserved.toString(), lockedAtomic: cappedLock.toString(),
      expiredAtomic: (now >= series.expiresAt ? balance : 0n).toString(), startsAt: series.startsAt, expiresAt: series.expiresAt
    };
  }
  #debit(state, accountId, seriesId, amount, now) {
    const series = this.#series(state, seriesId, now);
    if (BigInt(this.#summary(state, accountId, seriesId, now).availableAtomic) < amount) throw new Error('Insufficient unlocked balance');
    series.balances.set(accountId, (series.balances.get(accountId) || 0n) - amount);
  }
  #credit(state, accountId, series, amount, now) {
    this.#account(state, accountId);
    series.balances.set(accountId, (series.balances.get(accountId) || 0n) + amount);
    this.#topUpHolds(state, accountId, series.id, amount, now);
  }
  #root(state, id) {
    let account = this.#account(state, id);
    while (account.parentId) account = state.accounts.get(account.parentId);
    return account.id;
  }
  #descendsFrom(state, id, ancestorId) {
    let account = this.#account(state, id);
    while (account) {
      if (account.id === ancestorId) return true;
      account = account.parentId ? state.accounts.get(account.parentId) : null;
    }
    return false;
  }
  #validateMove(state, from, to, action) {
    if (from === to) throw new Error('Source and destination must differ');
    const source = this.#account(state, from);
    const destination = this.#account(state, to);
    if (!['transfer', 'payment', 'allocation'].includes(action)) throw new Error('Unsupported transfer action');
    if (action === 'allocation' && this.#root(state, from) !== this.#root(state, to)) throw new Error('Allocation must stay within one account hierarchy');
    const sourceRoot = this.#account(state, this.#root(state, source.id));
    const destinationRoot = this.#account(state, this.#root(state, destination.id));
    if (action === 'payment' && (destinationRoot.kind !== 'business' || !destinationRoot.approvedForPayments)) {
      throw new Error('Payment destination must be an approved business');
    }
    if (!this.#policy.allowPersonalTransfers && sourceRoot.kind === 'personal' && destinationRoot.kind === 'personal' && sourceRoot.id !== destinationRoot.id) {
      throw new Error('Personal transfers are disabled');
    }
    if (sourceRoot.id !== destinationRoot.id && destinationRoot.kind === 'business' && !destinationRoot.approvedForPayments) {
      throw new Error('Business is not approved for payments');
    }
  }

  #reduce(state, type, data, actor, now) {
    this.#advance(state, now);
    switch (type) {
      case 'createAccount': {
        const id = identifier(data.id);
        if (state.accounts.has(id) || !KINDS.has(data.kind)) throw new Error('Invalid or duplicate account');
        const owner = identifier(data.owner || actor);
        if (owner !== actor) this.#governance(actor);
        const parentId = data.parentId || null;
        if (data.kind === 'subaccount' && !parentId) throw new Error('Subaccount requires a parent');
        if (parentId) {
          this.#authorize(state, parentId, actor, 'owner');
          if (owner !== actor) throw new Error('Subaccount owner must be the creating principal');
          if (data.kind !== 'subaccount' && data.kind !== 'project') throw new Error('Only subaccounts and projects can have parents');
        }
        if (data.kind === 'treasury') this.#governance(actor);
        state.accounts.set(id, { id, kind: data.kind, parentId, approvedForPayments: false,
          members: parentId ? new Map() : new Map([[owner, 'owner']]) });
        return { accountId: id };
      }
      case 'grantRole': {
        this.#authorize(state, data.accountId, actor, 'owner');
        const account = this.#account(state, data.accountId);
        const member = identifier(data.member);
        if (!Object.hasOwn(ROLES, data.role)) throw new Error('Invalid account role');
        if (account.members.get(member) === 'owner' && data.role !== 'owner' &&
            [...account.members.values()].filter(role => role === 'owner').length === 1) throw new Error('Cannot remove the last explicit owner');
        account.members.set(member, data.role);
        for (const child of state.accounts.values()) {
          if (child.id !== account.id && this.#descendsFrom(state, child.id, account.id) &&
              (ROLES[child.members.get(member)] || 0) > ROLES[data.role]) child.members.delete(member);
        }
        return { accountId: account.id, member, role: data.role };
      }
      case 'revokeRole': {
        this.#authorize(state, data.accountId, actor, 'owner');
        const account = this.#account(state, data.accountId);
        const member = identifier(data.member);
        if (!account.parentId && account.members.get(member) === 'owner' &&
            [...account.members.values()].filter(role => role === 'owner').length === 1) throw new Error('Cannot remove the last explicit owner');
        for (const child of state.accounts.values()) {
          if (this.#descendsFrom(state, child.id, account.id)) child.members.delete(member);
        }
        return { accountId: account.id, member };
      }
      case 'approveBusiness': {
        this.#governance(actor);
        const account = this.#account(state, data.accountId);
        if (account.kind !== 'business' || typeof data.approved !== 'boolean') throw new Error('Invalid business approval');
        account.approvedForPayments = data.approved;
        return { accountId: account.id, approved: data.approved };
      }
      case 'createSeries': {
        this.#governance(actor);
        const window = annualWindow(data.year, this.#policy.timezone);
        const id = `ARC-${data.year}`;
        const cap = units(data.capAtomic ?? this.#policy.annualSupplyCapAtomic);
        if (cap > units(this.#policy.annualSupplyCapAtomic) || state.series.has(id)) throw new Error('Invalid or duplicate annual supply');
        if (now >= window.expiresAt) throw new Error('Cannot create an expired series');
        state.series.set(id, { id, year: data.year, ...window, cap, issued: 0n, burned: 0n, withdrawn: 0n, balances: new Map() });
        return { seriesId: id, ...window, capAtomic: cap.toString() };
      }
      case 'mint': {
        this.#governance(actor);
        const series = this.#series(state, data.seriesId, now);
        const amount = units(data.amountAtomic);
        if (series.issued + amount > series.cap) throw new Error('Annual issuance cap exceeded');
        this.#credit(state, data.to, series, amount, now);
        series.issued += amount;
        return { amountAtomic: amount.toString() };
      }
      case 'transfer': {
        this.#authorize(state, data.from, actor);
        if (data.destinationSeriesId && data.destinationSeriesId !== data.seriesId) throw new Error('Cross-year transfers are forbidden');
        this.#validateMove(state, data.from, data.to, data.action || 'transfer');
        const series = this.#series(state, data.seriesId, now);
        const amount = units(data.amountAtomic);
        this.#debit(state, data.from, data.seriesId, amount, now);
        this.#credit(state, data.to, series, amount, now);
        return { amountAtomic: amount.toString() };
      }
      case 'withdraw':
      case 'burn': {
        this.#authorize(state, data.accountId, actor);
        const amount = units(data.amountAtomic);
        this.#debit(state, data.accountId, data.seriesId, amount, now);
        const series = state.series.get(data.seriesId);
        series[type === 'burn' ? 'burned' : 'withdrawn'] += amount;
        return { amountAtomic: amount.toString(), externalTransferExecuted: false };
      }
      case 'reserve': {
        this.#authorize(state, data.from, actor);
        this.#validateMove(state, data.from, data.to, data.action || 'payment');
        const series = this.#series(state, data.seriesId, now);
        const id = identifier(data.reservationId);
        const amount = units(data.amountAtomic);
        timestamp(data.endsAt);
        if (state.reservations.has(id) || data.endsAt <= now || data.endsAt > series.expiresAt - this.#policy.settlementCutoffMs) throw new Error('Invalid reservation or settlement deadline');
        if (BigInt(this.#summary(state, data.from, data.seriesId, now).availableAtomic) < amount) throw new Error('Insufficient unlocked balance');
        state.reservations.set(id, { id, from: data.from, to: data.to, seriesId: data.seriesId, amount, endsAt: data.endsAt, status: 'reserved' });
        return { reservationId: id };
      }
      case 'settle':
      case 'cancelReservation': {
        const reservation = state.reservations.get(identifier(data.reservationId));
        if (!reservation || reservation.status !== 'reserved') throw new Error('Reservation is not active');
        this.#authorize(state, reservation.from, actor);
        const series = this.#series(state, reservation.seriesId, now);
        reservation.status = type === 'settle' ? 'settled' : 'cancelled';
        if (type === 'settle') {
          series.balances.set(reservation.from, series.balances.get(reservation.from) - reservation.amount);
          this.#credit(state, reservation.to, series, reservation.amount, now);
        } else this.#topUpHolds(state, reservation.from, series.id, reservation.amount, now);
        return { reservationId: reservation.id, status: reservation.status };
      }
      case 'applyJailtime': {
        this.#governance(actor);
        this.#authorize(state, data.accountId, data.subject, 'viewer');
        const series = this.#series(state, data.seriesId, now);
        const id = identifier(data.caseId);
        if (state.holds.has(id) || !this.#policy.jailtimePercentages.includes(data.percent)) throw new Error('Invalid Jailtime case or percentage');
        timestamp(data.endsAt);
        if (data.endsAt <= now || data.endsAt - now > this.#policy.maxJailtimeMs) throw new Error('Invalid Jailtime duration');
        for (const field of ['reason', 'evidenceRef']) {
          if (typeof data[field] !== 'string' || !data[field].trim() || data[field].length > 1000) throw new Error(`Jailtime ${field} is required`);
        }
        const summary = this.#summary(state, data.accountId, series.id, now);
        const basis = BigInt(summary.nominalAtomic) - BigInt(summary.reservedAtomic);
        const locked = ceilPercent(basis, data.percent);
        state.holds.set(id, { id, accountId: data.accountId, seriesId: series.id, subject: data.subject,
          percent: data.percent, basis, locked, startsAt: now, endsAt: data.endsAt,
          reason: data.reason, evidenceRef: data.evidenceRef, approvedBy: actor,
          policyVersion: this.#policy.version, releasedAt: null, appeal: null });
        return { caseId: id, lockedAtomic: locked.toString() };
      }
      case 'appeal': {
        const hold = state.holds.get(identifier(data.caseId));
        if (!hold) throw new Error('Unknown Jailtime case');
        this.#authorize(state, hold.accountId, actor, 'viewer');
        if (typeof data.reason !== 'string' || !data.reason.trim() || data.reason.length > 1000) throw new Error('Appeal reason is required');
        if (hold.appeal) throw new Error('Appeal already exists');
        hold.appeal = { by: actor, at: now, reason: data.reason, status: 'pending' };
        return { caseId: hold.id, status: 'pending' };
      }
      case 'releaseJailtime': {
        this.#governance(actor);
        const hold = state.holds.get(identifier(data.caseId));
        if (!hold || hold.releasedAt !== null) throw new Error('Jailtime case is not releasable');
        if (typeof data.reason !== 'string' || !data.reason.trim() || data.reason.length > 1000) throw new Error('Release reason is required');
        hold.releasedAt = now;
        hold.releaseReason = data.reason;
        if (hold.appeal) hold.appeal.status = 'accepted';
        return { caseId: hold.id };
      }
      default: throw new Error('Unsupported command; external bridge and swap operations are disabled');
    }
  }
  #invariants(state) {
    for (const series of state.series.values()) {
      let held = 0n;
      for (const balance of series.balances.values()) {
        if (balance < 0n) throw new Error('Negative balance invariant');
        held += balance;
      }
      if (series.issued > series.cap || held + series.burned + series.withdrawn !== series.issued) throw new Error('Annual conservation invariant failed');
    }
  }
  #executeAt(command, now, persist = true) {
    this.#healthy();
    this.#observe(now);
    const input = JSON.parse(JSON.stringify(command));
    identifier(input.actor);
    identifier(input.requestId);
    if (typeof input.type !== 'string' || !input.data || typeof input.data !== 'object' || Array.isArray(input.data)) throw new Error('Invalid command');
    const digest = hash(input);
    const old = this.#state.requests.get(input.requestId);
    if (old) {
      if (old.digest !== digest) throw new Error('Request ID was reused with a different command');
      return structuredClone(old.receipt);
    }
    if (this.#events.length && now < this.#events.at(-1).at) throw new Error('Ledger clock moved backwards');
    const next = structuredClone(this.#state);
    const result = this.#reduce(next, input.type, input.data, input.actor, now);
    this.#invariants(next);
    const body = { sequence: this.#events.length + 1, at: now, policyHash: this.#policyHash,
      previousHash: this.#events.at(-1)?.hash || GENESIS, command: input, result };
    const event = { ...body, hash: hash(body) };
    if (persist && this.#appendEvent) {
      try {
        const outcome = this.#appendEvent(structuredClone(event));
        if (outcome && typeof outcome.then === 'function') throw new Error('Journal writer must be synchronous');
      } catch (error) { this.#failed = true; throw error; }
    }
    next.requests.set(input.requestId, { digest, receipt: event });
    this.#state = next;
    this.#events.push(event);
    return structuredClone(event);
  }
  execute(command) { return this.#executeAt(command, this.#clock()); }
  #command(type, data, actor, options = {}) {
    return this.execute({ type, data, actor, requestId: options.requestId || randomUUID() });
  }
  createAccount(data, caller, options) { return this.#command('createAccount', data, caller, options); }
  grantRole(data, caller, options) { return this.#command('grantRole', data, caller, options); }
  revokeRole(accountId, member, caller, options) { return this.#command('revokeRole', { accountId, member }, caller, options); }
  approveBusiness(accountId, approved, caller, options) { return this.#command('approveBusiness', { accountId, approved }, caller, options); }
  createAnnualSeries(data, caller, options) { return this.#command('createSeries', data, caller, options); }
  mint(to, amount, caller, options = {}) { return this.#command('mint', { to, amountAtomic: units(amount).toString(), seriesId: options.seriesId }, caller, options); }
  transfer(from, to, amount, options = {}) { return this.#command('transfer', {
    from, to, amountAtomic: units(amount).toString(), seriesId: options.seriesId,
    action: options.action || 'transfer', destinationSeriesId: options.destinationSeriesId
  }, options.caller, options); }
  withdraw(accountId, amount, caller, options = {}) { return this.#command('withdraw', { accountId, amountAtomic: units(amount).toString(), seriesId: options.seriesId }, caller, options); }
  burn(accountId, amount, caller, options = {}) { return this.#command('burn', { accountId, amountAtomic: units(amount).toString(), seriesId: options.seriesId }, caller, options); }
  reserve(data, caller, options) { return this.#command('reserve', data, caller, options); }
  settle(reservationId, caller, options) { return this.#command('settle', { reservationId }, caller, options); }
  cancelReservation(reservationId, caller, options) { return this.#command('cancelReservation', { reservationId }, caller, options); }
  applyJailtime(data, caller, options) { return this.#command('applyJailtime', data, caller, options); }
  appeal(caseId, reason, caller, options) { return this.#command('appeal', { caseId, reason }, caller, options); }
  releaseJailtime(caseId, reason, caller, options) { return this.#command('releaseJailtime', { caseId, reason }, caller, options); }
  #view() {
    this.#healthy();
    const now = timestamp(this.#clock());
    this.#observe(now);
    if (this.#events.length && now < this.#events.at(-1).at) throw new Error('Ledger clock moved backwards');
    const state = structuredClone(this.#state);
    this.#advance(state, now);
    return { state, now };
  }
  getBalanceSummary(accountId, seriesId, caller) {
    const { state, now } = this.#view();
    if (caller !== undefined) this.#authorize(state, accountId, identifier(caller), 'viewer');
    return this.#summary(state, accountId, seriesId, now);
  }
  getBalance(accountId, seriesId) { return this.getBalanceSummary(accountId, seriesId).availableAtomic; }
  getAnnualStats(seriesId) {
    const { state, now } = this.#view();
    const series = this.#series(state, seriesId, now, false);
    const outstanding = series.issued - series.burned - series.withdrawn;
    return { seriesId, startsAt: series.startsAt, expiresAt: series.expiresAt,
      capAtomic: series.cap.toString(), issuedAtomic: series.issued.toString(), burnedAtomic: series.burned.toString(),
      withdrawnAtomic: series.withdrawn.toString(), outstandingAtomic: outstanding.toString(),
      expiredAtomic: (now >= series.expiresAt ? outstanding : 0n).toString() };
  }
  getJailtimeCase(caseId) {
    const { state, now } = this.#view();
    const hold = state.holds.get(identifier(caseId));
    if (!hold) throw new Error('Unknown Jailtime case');
    return { ...hold, basis: hold.basis.toString(), locked: hold.locked.toString(),
      status: hold.releasedAt !== null ? 'released' : now >= hold.endsAt ? 'ended' : 'active' };
  }
  getTransactions() { this.#healthy(); return structuredClone(this.#events); }
  getPolicy() { return structuredClone(this.#policy); }
  exportSnapshot() { this.#healthy(); return { schemaVersion: 1, policy: this.getPolicy(), events: this.getTransactions() }; }
  static restore(snapshot, options = {}) {
    if (snapshot.schemaVersion !== 1 || !Array.isArray(snapshot.events)) throw new Error('Invalid ledger snapshot');
    const policy = options.policy || snapshot.policy;
    if (canonical(validatePolicy(policy)) !== canonical(validatePolicy(snapshot.policy))) throw new Error('Snapshot policy mismatch');
    const ledger = new ArenaCreditService({ ...options, policy });
    for (const event of snapshot.events) {
      if (event.sequence !== ledger.#events.length + 1) throw new Error('Journal sequence verification failed');
      const replayed = ledger.#executeAt(event.command, event.at, false);
      if (canonical(replayed) !== canonical(event)) throw new Error('Journal integrity verification failed');
    }
    return ledger;
  }
}

// Importing the legacy module creates no balances and performs no migration.
module.exports = new ArenaCreditService();
module.exports.ArenaCreditService = ArenaCreditService;
