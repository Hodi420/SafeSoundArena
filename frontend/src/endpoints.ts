// API endpoint definitions for SafeSoundArena Marketplace and related features

export const API_ENDPOINTS = {
  MARKETPLACE: {
    LIST: '/api/marketplace', // GET - list all items
    BUY: (itemId: string) => `/api/marketplace/buy/${itemId}`, // POST - buy item
    SELL: (itemId: string) => `/api/marketplace/sell/${itemId}` // POST - sell item
  },
  EVENTS: {
    LIST: '/api/events',
    JOIN: (eventId: string) => `/api/events/join/${eventId}`,
    LEAVE: (eventId: string) => `/api/events/leave/${eventId}`,
  },
  USER: {
    PROFILE: (userId: string) => `/api/user/${userId}` // GET - user profile
  }
};
