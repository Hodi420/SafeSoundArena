// סקיצה ראשונה של טיפוסים עיקריים לפרויקט, בהשראת דפוסי Web3/גיימינג מודרניים (SHIB.IO)

export interface User {
  id: string;
  username: string;
  avatarUrl?: string;
  walletAddress: string;
}

export interface Balance {
  available: number;
  staked: number;
  pending: number;
}

export interface Challenge {
  id: string;
  emoji: string;
  title: string;
  description?: string;
  reward?: number;
}

export interface Faction {
  id: string;
  name: string;
  emoji: string;
  description?: string;
}

export interface Guild {
  id: string;
  name: string;
  emoji: string;
  members: User[];
}

export interface Notification {
  id: string;
  emoji: string;
  content: string;
  read: boolean;
  timestamp: string;
}

export interface MiniGame {
  id: string;
  name: string;
  emoji: string;
  description: string;
  highScores: { score: number; user: string }[];
  rewards: { experience: number; currency: number };
}

export interface MarketplaceItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
  description?: string;
}

export interface Transaction {
  id: string;
  type: 'reward' | 'transfer' | 'stake';
  amount: number;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
  from: string;
  to: string;
  emoji: string;
}

export interface FactionReputation {
  id: string;
  name: string;
  emoji: string;
  reputation: number;
}

export interface Reputation {
  total: number;
  rank: string;
  factions: FactionReputation[];
}

export interface AIContext {
  currentQuest?: string;
  recentAchievements: string[];
  userPreferences: Record<string, unknown>;
  emotionalState: string;
}

export interface Character {
  id: string;
  name: string;
  element: string;
  level: number;
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
}

export interface Weather {
  current: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  emoji: string;
  quantity: number;
}
