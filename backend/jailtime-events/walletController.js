'use strict';

const { hash, identifier } = require('../../blockchain/annualPolicy');

// Host adapters must resolve an authenticated identity and load an approved
// decision from trusted storage. Never derive either from a joinJail profile.
function createJailtimeWalletController({ ledger, resolvePrincipal, loadApprovedDecision }) {
  if (!ledger || typeof resolvePrincipal !== 'function' || typeof loadApprovedDecision !== 'function') {
    throw new Error('Ledger, identity resolver and approved-decision loader are required');
  }
  async function principal(context) {
    return identifier(await resolvePrincipal(context));
  }
  return {
    async applyDecision(context, decisionId) {
      const actor = await principal(context);
      const decision = await loadApprovedDecision(identifier(decisionId), actor);
      if (!decision || decision.id !== decisionId || decision.status !== 'approved' || decision.walletScope !== 'account') {
        throw new Error('An approved, explicitly account-scoped decision is required');
      }
      return ledger.applyJailtime({ caseId: decision.id, accountId: decision.accountId,
        subject: decision.subject, seriesId: decision.seriesId, percent: decision.percent,
        endsAt: decision.endsAt, reason: decision.reason, evidenceRef: decision.evidenceRef }, actor,
      { requestId: `jail.apply.${hash(decisionId).slice(0, 32)}` });
    },
    async appeal(context, { caseId, reason, requestId }) {
      return ledger.appeal(caseId, reason, await principal(context), { requestId: identifier(requestId) });
    },
    async releaseDecision(context, decisionId) {
      const actor = await principal(context);
      const decision = await loadApprovedDecision(identifier(decisionId), actor);
      if (!decision || decision.id !== decisionId || decision.status !== 'approved' || decision.type !== 'release') {
        throw new Error('An approved release decision is required');
      }
      return ledger.releaseJailtime(decision.caseId, decision.reason, actor,
        { requestId: `jail.release.${hash(decisionId).slice(0, 32)}` });
    },
    async balance(context, accountId, seriesId) {
      return ledger.getBalanceSummary(accountId, seriesId, await principal(context));
    }
  };
}

module.exports = { createJailtimeWalletController };
