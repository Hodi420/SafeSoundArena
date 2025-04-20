// API Endpoints configuration
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    VERIFY: '/auth/verify',
    PI_CONNECT: '/auth/pi-connect',
  },
  QUESTS: {
    LIST: '/quests',
    DETAILS: (id: string) => `/quests/${id}`,
    PROGRESS: (id: string) => `/quests/${id}/progress`,
    REWARDS: (id: string) => `/quests/${id}/rewards`,
  },
  SOCIAL: {
    PROFILE: (id: string) => `/profiles/${id}`,
    LEADERBOARD: '/leaderboard',
    ACHIEVEMENTS: '/achievements',
  },
  BLOCKCHAIN: {
    TRANSACTIONS: '/blockchain/transactions',
    BALANCE: '/blockchain/balance',
    TRANSFER: '/blockchain/transfer',
  },
  AI: {
    CHAT: '/ai/chat',
    FACIAL: '/ai/facial-analysis',
    CONTEXT: '/ai/context',
  },
  EVENTS: {
    LIST: '/events',
    JOIN: (id: string) => `/events/${id}/join`,
    LEAVE: (id: string) => `/events/${id}/leave`,
  },
  REPUTATION: {
    USER: (id: string) => `/reputation/${id}`,
    FACTIONS: '/reputation/factions',
    FACTION: (id: string) => `/reputation/factions/${id}`,
  },
  MARKETPLACE: {
    LIST: '/marketplace',
    ITEM: (id: string) => `/marketplace/items/${id}`,
    BUY: (id: string) => `/marketplace/items/${id}/buy`,
    SELL: (id: string) => `/marketplace/items/${id}/sell`,
  },
  GUILDS: {
    LIST: '/guilds',
    DETAILS: (id: string) => `/guilds/${id}`,
    JOIN: (id: string) => `/guilds/${id}/join`,
    LEAVE: (id: string) => `/guilds/${id}/leave`,
    MESSAGE: (id: string) => `/guilds/${id}/message`,
  },
  NOTIFICATIONS: {
    LIST: '/notifications',
    READ: (id: string) => `/notifications/${id}/read`,
    ALL_READ: '/notifications/read-all',
  },
  CHALLENGES: {
    DAILY: '/challenges/daily',
    WEEKLY: '/challenges/weekly',
    CLAIM: (id: string) => `/challenges/${id}/claim`,
  },
} as const;
