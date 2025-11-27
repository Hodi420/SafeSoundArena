import { encryptSecret } from '../utils/crypto';

export type StoredToken = {
  id: string;
  provider: string;
  alias?: string;
  last4: string;
  createdAt: string;
  valid: boolean;
  // encrypted fields (not exposed)
  _secret?: { enc: string; iv: string; tag: string };
};

// In-memory store placeholder; replace with Mongo model in production
const userIdToTokens: Record<string, StoredToken[]> = {};

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function listTokens(userId: string): StoredToken[] {
  return userIdToTokens[userId] || [];
}

export function addToken(
  userId: string,
  provider: string,
  token: string,
  alias?: string
): StoredToken {
  const enc = encryptSecret(token);
  const last4 = token.slice(-4).padStart(Math.min(token.length, 4), '*');
  const t: StoredToken = {
    id: generateId(),
    provider,
    alias,
    last4,
    createdAt: new Date().toISOString(),
    valid: true,
    _secret: enc || undefined,
  };
  if (!userIdToTokens[userId]) userIdToTokens[userId] = [];
  userIdToTokens[userId].push(t);
  return { ...t, _secret: undefined };
}

export function removeToken(userId: string, id: string): boolean {
  if (!userIdToTokens[userId]) return false;
  const before = userIdToTokens[userId].length;
  userIdToTokens[userId] = userIdToTokens[userId].filter((t) => t.id !== id);
  return userIdToTokens[userId].length < before;
}
