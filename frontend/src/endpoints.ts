// API endpoint definitions for SafeSoundArena Marketplace and related features

export const API_ENDPOINTS = {
  AI: {
    CHAT: '/api/ai/chat',
    FACIAL: '/api/ai/facial',
    CONTEXT: '/api/ai/context',
  },
  BLOCKCHAIN: {
    BALANCE: '/api/blockchain/balance',
    TRANSACTIONS: '/api/blockchain/transactions',
    TRANSFER: '/api/blockchain/transfer',
  },
  CHALLENGES: {
    DAILY: '/api/challenges/daily',
    WEEKLY: '/api/challenges/weekly',
    CLAIM: (challengeId: string) => `/api/challenges/${challengeId}/claim`,
  },
  EVENTS: {
    LIST: '/api/events',
    JOIN: (eventId: string) => `/api/events/${eventId}/join`,
    LEAVE: (eventId: string) => `/api/events/${eventId}/leave`,
  },
  GUILDS: {
    LIST: '/api/guilds',
    DETAILS: (guildId: string) => `/api/guilds/${guildId}`,
    JOIN: (guildId: string) => `/api/guilds/${guildId}/join`,
    LEAVE: (guildId: string) => `/api/guilds/${guildId}/leave`,
    MESSAGE: (guildId: string) => `/api/guilds/${guildId}/messages`,
  },
  MARKETPLACE: {
    LIST: '/api/marketplace', // GET - list all items
    BUY: (itemId: string) => `/api/marketplace/buy/${itemId}`, // POST - buy item
    SELL: (itemId: string) => `/api/marketplace/sell/${itemId}` // POST - sell item
  },
  NOTIFICATIONS: {
    LIST: '/api/notifications',
    READ: (notificationId: string) => `/api/notifications/${notificationId}/read`,
    ALL_READ: '/api/notifications/read-all',
  },
  QUESTS: {
    LIST: '/api/quests',
    DETAILS: (questId: string) => `/api/quests/${questId}`,
    PROGRESS: (questId: string) => `/api/quests/${questId}/progress`,
  },
  REPUTATION: {
    USER: (userId: string) => `/api/reputation/${userId}`,
    FACTIONS: '/api/reputation/factions',
  },
  SOCIAL: {
    PROFILE: (userId: string) => `/api/social/profile/${userId}`,
    LEADERBOARD: '/api/social/leaderboard',
    ACHIEVEMENTS: '/api/social/achievements',
  },
  USER: {
    PROFILE: (userId: string) => `/api/user/${userId}`,
  },
};
