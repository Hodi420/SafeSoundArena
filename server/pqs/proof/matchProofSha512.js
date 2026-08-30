const crypto = require('crypto');

const PROOF_VERSION = 'pqs.match-proof.sha512.v1';

function canonicalize(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`;
  }

  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
}

function buildProofPayload(matchRecord) {
  if (!matchRecord || typeof matchRecord !== 'object') {
    throw new TypeError('matchRecord is required');
  }

  if (matchRecord.status !== 'completed') {
    throw new Error('matchRecord must be completed before a proof hash is created');
  }

  return {
    proofVersion: PROOF_VERSION,
    matchId: matchRecord.matchId,
    mode: matchRecord.mode,
    rulesVersion: matchRecord.rulesVersion,
    status: matchRecord.status,
    startedAt: matchRecord.startedAt,
    completedAt: matchRecord.completedAt,
    winnerTeamId: matchRecord.winnerTeamId || null,
    teams: matchRecord.teams,
    events: matchRecord.events,
    antiAbuseFindings: matchRecord.antiAbuseFindings || [],
    previewRewards: matchRecord.previewRewards || []
  };
}

function createMatchProof(matchRecord) {
  const payload = buildProofPayload(matchRecord);
  const canonicalPayload = canonicalize(payload);
  const proofHash = crypto.createHash('sha512').update(canonicalPayload, 'utf8').digest('hex');

  return Object.freeze({
    proofVersion: PROOF_VERSION,
    algorithm: 'sha512',
    proofHash,
    canonicalPayload
  });
}

module.exports = {
  PROOF_VERSION,
  canonicalize,
  buildProofPayload,
  createMatchProof
};
