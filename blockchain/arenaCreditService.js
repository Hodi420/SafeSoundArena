// Arena Credit Service - Off-chain simulation for future Pi Network token integration
// This service mimics a decentralized token logic, ready to be swapped for a smart contract/SDK once Pi Network allows custom tokens.

class ArenaCreditService {
  constructor() {
    // --- CONFIGURATION ---
    this.balances = {}; // { userId: balance }
    this.transactions = []; // [{ type, fromUser, toUser, amount, date, txId, meta }]
    this.totalSupply = 1000000; // Initial supply
    this.owner = 'admin';
    // admins: Map<userId, type> where type = 'owner' | 'intermediate' | 'regular'
    this.admins = new Map([['admin', 'owner']]);
    this.MAX_ADMINS = 300;
    this.MAX_INTERMEDIATE = 70;
    this.frozenAccounts = new Set(); // Accounts that are frozen
    this.whitelist = new Set(); // Optional: whitelist for transfers/mint
    this.tokenomics = {
      name: 'Arena Credit',
      symbol: 'ARC',
      maxSupply: 1000000,
      decimals: 2,
      allocations: {
        community: 500000,
        team: 200000,
        development: 200000,
        reserve: 100000
      },
      vesting: {
        team: { total: 200000, released: 0, start: Date.now(), duration: 2 * 365 * 24 * 3600 * 1000 } // 2 years
      }
    };
    // Initial allocations
    this.balances['community'] = 500000;
    this.balances['team'] = 200000;
    this.balances['development'] = 200000;
    this.balances['reserve'] = 100000;
    // --- HOOKS ---
    this.onTransfer = null; // Optional event hooks
    this.onMint = null;
    this.onBurn = null;

    // כתובת השריפה הקבועה
    this.BURN_ADDRESS = '0x0000000000000000000000000000000000000000';
  }

  /**
   * Internal: log transaction with unique txId
   */
  _logTx(type, fromUser, toUser, amount, meta = {}) {
    const txId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    this.transactions.push({
      type, fromUser, toUser, amount,
      date: new Date().toISOString(),
      txId,
      meta
    });
  }

  // Mint new tokens (admin only)
  async mint(to, amount, caller, meta = {}) {
    if (!this.admins.has(caller)) throw new Error('Unauthorized');
    if (this.totalSupply + amount > this.tokenomics.maxSupply)
      throw new Error('Max supply exceeded');
    if (this.frozenAccounts.has(to)) throw new Error('Recipient account is frozen');
    if (this.whitelist.size && !this.whitelist.has(to)) throw new Error('Recipient not whitelisted');
    this.balances[to] = (this.balances[to] || 0) + amount;
    this.totalSupply += amount;
    this._logTx('mint', null, to, amount, meta);
    if (typeof this.onMint === 'function') this.onMint(to, amount, meta);
  }

  // Burn tokens (admin only)
  async burn(from, amount, caller, meta = {}) {
    if (!this.admins.has(caller)) throw new Error('Unauthorized');
    if ((this.balances[from] || 0) < amount) throw new Error('Insufficient balance');
    if (this.frozenAccounts.has(from)) throw new Error('Account is frozen');
    this.balances[from] -= amount;
    this.totalSupply -= amount;
    this._logTx('burn', from, null, amount, meta);
    if (typeof this.onBurn === 'function') this.onBurn(from, amount, meta);
  }

  // Transfer tokens between users
  /**
   * Transfer tokens between users, with network fee.
   * Fee: max(2 ARC, 0.5% מהסכום). העמלה נשרפת (burn)
   */
  async transfer(from, to, amount, meta = {}) {
    const percentFee = Math.ceil(amount * 0.005); // 0.5% מהסכום, מעוגל למעלה
    const fee = Math.max(2, percentFee);
    if ((this.balances[from] || 0) < amount + fee) throw new Error('Insufficient balance (with fee)');
    if (this.frozenAccounts.has(from) || this.frozenAccounts.has(to)) throw new Error('Account is frozen');
    if (this.whitelist.size && (!this.whitelist.has(from) || !this.whitelist.has(to))) throw new Error('Account not whitelisted');
    this.balances[from] -= (amount + fee);
    this.balances[to] = (this.balances[to] || 0) + amount;
    // העמלה נשלחת ל-burn address (כתובת שריפה פנימית)
    const burnAddress = this.BURN_ADDRESS;
    this.balances[burnAddress] = (this.balances[burnAddress] || 0) + fee;
    this._logTx('transfer', from, to, amount, { ...meta, fee, burnAddress });
    if (typeof this.onTransfer === 'function') this.onTransfer(from, to, amount, { ...meta, fee, burnAddress });
  }

  // Get user balance
  async getBalance(userId) {
    return this.balances[userId] || 0;
  }

  // Get total burned amount (in burn address)
  async getBurnedAmount() {
    return this.balances[this.BURN_ADDRESS] || 0;
  }

  // Get all holders with balance > 0
  async getHolders() {
    return Object.entries(this.balances)
      .filter(([userId, bal]) => bal > 0)
      .map(([userId, bal]) => ({ userId, balance: bal }));
  }

  async getTotalSupply() {
    return this.totalSupply;
  }

  async getFrozenAccounts() {
    return Array.from(this.frozenAccounts);
  }

  async getAdmins() {
    // returns [{userId, type}]
    return Array.from(this.admins.entries()).map(([userId, type]) => ({ userId, type }));
  }

  async getAdminCount() {
    return this.admins.size;
  }

  async getIntermediateCount() {
    return Array.from(this.admins.values()).filter(type => type === 'intermediate').length;
  }

  // Get transaction log
  async getTransactions(userId = null) {
    if (!userId) return this.transactions;
    return this.transactions.filter(
      tx => tx.fromUser === userId || tx.toUser === userId
    );
  }

  async getStats() {
    return {
      totalSupply: this.totalSupply,
      holders: Object.keys(this.balances).length,
      frozen: this.frozenAccounts.size,
      admins: this.admins.size,
      txCount: this.transactions.length
    };
  }

  // Tokenomics info
  async getTokenomics() {
    return this.tokenomics;
  }

  // --- ADMIN/SECURITY METHODS ---
  /**
   * Add admin
   * @param {string} userId
   * @param {string} caller
   * @param {'regular'|'intermediate'} type
   */
  async addAdmin(userId, caller, type = 'regular') {
    if (caller !== this.owner) throw new Error('Only owner can add admin');
    if (this.admins.size >= this.MAX_ADMINS) throw new Error('Admin slots full');
    if (type === 'intermediate') {
      const intermCount = await this.getIntermediateCount();
      if (intermCount >= this.MAX_INTERMEDIATE) throw new Error('Intermediate admin slots full');
    }
    if (this.admins.has(userId)) throw new Error('Already admin');
    if (type !== 'regular' && type !== 'intermediate') throw new Error('Invalid admin type');
    this.admins.set(userId, type);
    this._logTx('addAdmin', caller, userId, 0, { type });
  }

  /**
   * Remove admin
   */
  async removeAdmin(userId, caller) {
    if (caller !== this.owner) throw new Error('Only owner can remove admin');
    if (userId === this.owner) throw new Error('Cannot remove owner');
    this.admins.delete(userId);
    this._logTx('removeAdmin', caller, userId, 0, {});
  }

  /**
   * Check admin type
   */
  async getAdminType(userId) {
    return this.admins.get(userId) || null;
  }

  async freezeAccount(userId, caller) {
    if (!this.admins.has(caller)) throw new Error('Unauthorized');
    this.frozenAccounts.add(userId);
    this._logTx('freeze', caller, userId, 0, { reason: 'freeze' });
  }

  async unfreezeAccount(userId, caller) {
    if (!this.admins.has(caller)) throw new Error('Unauthorized');
    this.frozenAccounts.delete(userId);
    this._logTx('unfreeze', caller, userId, 0, { reason: 'unfreeze' });
  }

  async addToWhitelist(userId, caller) {
    if (!this.admins.has(caller)) throw new Error('Unauthorized');
    this.whitelist.add(userId);
    this._logTx('addToWhitelist', caller, userId, 0, {});
  }

  async removeFromWhitelist(userId, caller) {
    if (!this.admins.has(caller)) throw new Error('Unauthorized');
    this.whitelist.delete(userId);
    this._logTx('removeFromWhitelist', caller, userId, 0, {});
      fromUser,
      toUser,
      amount,
      date: new Date().toISOString(),
      meta
    });
  }
}

module.exports = new ArenaCreditService();
