const fs = require('fs');
const path = require('path');

class FeatureStoreError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'FeatureStoreError';
    this.status = status;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createSeedState() {
  const now = new Date();
  const futureStart = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const futureEnd = new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000).toISOString();
  return {
    events: [
      {
        id: 'event-carnival',
        title: 'Carnival Arena',
        description: 'Compete in the next SafeSoundArena activity cycle.',
        startTime: futureStart,
        endTime: futureEnd,
        capacity: 100,
        type: 'tournament',
        rewards: [{ amount: 100, type: 'Pi' }],
        emoji: '🏆',
        participantIds: [],
      },
    ],
    marketplace: [
      {
        id: 'starter-scroll',
        name: 'Starter Scroll',
        description: 'A safe entry scroll for new arena participants.',
        price: 10,
        emoji: '📜',
        seller: 'SafeSoundArena',
        quantity: 25,
        rarity: 'Common',
        type: 'scroll',
      },
      {
        id: 'guardian-badge',
        name: 'Guardian Badge',
        description: 'A cosmetic badge for verified community guardians.',
        price: 50,
        emoji: '🛡️',
        seller: 'SafeSoundArena',
        quantity: 10,
        rarity: 'Rare',
        type: 'badge',
      },
    ],
    quests: [
      {
        id: 'welcome-to-arena',
        title: 'Welcome to the Arena',
        description: 'Complete your first SafeSoundArena activity.',
        reward: 25,
        difficulty: 'Easy',
        progress: 0,
        status: 'active',
        requirements: ['Join one activity'],
        emoji: '🎯',
      },
      {
        id: 'proof-of-activity',
        title: 'Proof of Activity',
        description: 'Build a consistent activity record.',
        reward: 100,
        difficulty: 'Medium',
        progress: 0,
        status: 'active',
        requirements: ['Complete three activity cycles'],
        emoji: '✅',
      },
    ],
    guilds: [
      {
        id: 'guardian-circle',
        name: 'Guardian Circle',
        description: 'A community for safe and consistent participation.',
        emoji: '🛡️',
        leader: 'SafeSoundArena',
        rank: 'Founding',
        memberIds: [],
        messages: [],
      },
    ],
    notifications: [
      {
        id: 'welcome-notification',
        type: 'welcome',
        content: 'Welcome to SafeSoundArena.',
        read: false,
        timestamp: '2026-08-19T00:00:00.000Z',
        emoji: '👋',
      },
    ],
    challenges: {
      daily: [
        {
          id: 'daily-first-step',
          type: 'daily',
          title: 'First Step',
          description: 'Join one activity today.',
          progress: 0,
          goal: 1,
          claimed: false,
          emoji: '🚀',
          reward: { type: 'XP', amount: 25, emoji: '✨' },
        },
      ],
      weekly: [
        {
          id: 'weekly-consistency',
          type: 'weekly',
          title: 'Consistency',
          description: 'Participate in three activities this week.',
          progress: 0,
          goal: 3,
          claimed: false,
          emoji: '🔥',
          reward: { type: 'Pi', amount: 50, emoji: 'π' },
        },
      ],
    },
  };
}

function normalizeState(state) {
  const normalized = clone(state || {});
  normalized.events = Array.isArray(normalized.events) ? normalized.events : [];
  normalized.events.forEach((event) => {
    event.participantIds = Array.isArray(event.participantIds) ? event.participantIds : [];
  });
  normalized.marketplace = Array.isArray(normalized.marketplace) ? normalized.marketplace : [];
  normalized.quests = Array.isArray(normalized.quests) ? normalized.quests : [];
  normalized.guilds = Array.isArray(normalized.guilds) ? normalized.guilds : [];
  normalized.guilds.forEach((guild) => {
    guild.memberIds = Array.isArray(guild.memberIds) ? guild.memberIds : [];
    guild.messages = Array.isArray(guild.messages) ? guild.messages : [];
  });
  normalized.notifications = Array.isArray(normalized.notifications) ? normalized.notifications : [];
  normalized.challenges = normalized.challenges || { daily: [], weekly: [] };
  normalized.challenges.daily = Array.isArray(normalized.challenges.daily) ? normalized.challenges.daily : [];
  normalized.challenges.weekly = Array.isArray(normalized.challenges.weekly) ? normalized.challenges.weekly : [];
  return normalized;
}

function publicEvent(event) {
  const result = clone(event);
  result.participants = (event.participantIds || []).length;
  delete result.participantIds;
  return result;
}

function publicGuild(guild) {
  const result = clone(guild);
  result.members = (guild.memberIds || []).length;
  delete result.memberIds;
  delete result.messages;
  return result;
}

function createFeatureStore(options = {}) {
  const dataDir = options.dataDir || process.env.SAFESOUND_DATA_DIR || path.join(__dirname, 'data');
  const stateFile = options.stateFile || path.join(dataDir, 'feature-state.json');
  const persistEnabled = options.persist !== false;
  let state = normalizeState(options.initialState || loadState(stateFile));

  function persist() {
    if (!persistEnabled) return;
    fs.mkdirSync(path.dirname(stateFile), { recursive: true });
    const tempFile = `${stateFile}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(tempFile, stateFile);
  }

  function getEvent(id) {
    const event = state.events.find((item) => item.id === id);
    if (!event) throw new FeatureStoreError(404, 'Event not found');
    return event;
  }

  function getQuest(id) {
    const quest = state.quests.find((item) => item.id === id);
    if (!quest) throw new FeatureStoreError(404, 'Quest not found');
    return quest;
  }

  function getGuild(id) {
    const guild = state.guilds.find((item) => item.id === id);
    if (!guild) throw new FeatureStoreError(404, 'Guild not found');
    return guild;
  }

  return {
    listEvents: () => state.events.map(publicEvent),
    joinEvent(id, userId) {
      const event = getEvent(id);
      if (new Date(event.endTime).getTime() < Date.now()) {
        throw new FeatureStoreError(409, 'Event has ended');
      }
      if (event.participantIds.includes(userId)) return { success: true, event: publicEvent(event), joined: false };
      if (event.participantIds.length >= event.capacity) {
        throw new FeatureStoreError(409, 'Event is at capacity');
      }
      event.participantIds.push(userId);
      persist();
      return { success: true, event: publicEvent(event), joined: true };
    },
    leaveEvent(id, userId) {
      const event = getEvent(id);
      event.participantIds = event.participantIds.filter((item) => item !== userId);
      persist();
      return { success: true, event: publicEvent(event) };
    },

    listMarketplace: () => clone(state.marketplace),
    buyItem(id) {
      const item = state.marketplace.find((entry) => entry.id === id);
      if (!item) throw new FeatureStoreError(404, 'Marketplace item not found');
      if (item.quantity < 1) throw new FeatureStoreError(409, 'Item is out of stock');
      item.quantity -= 1;
      persist();
      return { success: true, item: clone(item) };
    },
    sellItem(id, quantity, price) {
      const item = state.marketplace.find((entry) => entry.id === id);
      if (!item) throw new FeatureStoreError(404, 'Marketplace item not found');
      if (!Number.isInteger(quantity) || quantity < 1) throw new FeatureStoreError(400, 'Quantity must be a positive integer');
      if (typeof price !== 'number' || price < 0) throw new FeatureStoreError(400, 'Price must be a non-negative number');
      item.quantity += quantity;
      item.price = price;
      persist();
      return { success: true, item: clone(item) };
    },

    listQuests: () => clone(state.quests),
    getQuest: (id) => clone(getQuest(id)),
    updateQuestProgress(id, progress) {
      const quest = getQuest(id);
      if (typeof progress !== 'number' || progress < 0 || progress > 100) {
        throw new FeatureStoreError(400, 'Progress must be a number between 0 and 100');
      }
      quest.progress = progress;
      quest.status = progress >= 100 ? 'completed' : 'active';
      persist();
      return clone(quest);
    },

    listGuilds: () => state.guilds.map(publicGuild),
    getGuild: (id) => publicGuild(getGuild(id)),
    joinGuild(id, userId) {
      const guild = getGuild(id);
      if (!guild.memberIds.includes(userId)) guild.memberIds.push(userId);
      persist();
      return { success: true, guild: publicGuild(guild) };
    },
    leaveGuild(id, userId) {
      const guild = getGuild(id);
      guild.memberIds = guild.memberIds.filter((item) => item !== userId);
      persist();
      return { success: true, guild: publicGuild(guild) };
    },
    listGuildMessages(id) {
      return clone(getGuild(id).messages || []);
    },

    listNotifications: () => clone(state.notifications),
    readNotification(id) {
      const notification = state.notifications.find((item) => item.id === id);
      if (!notification) throw new FeatureStoreError(404, 'Notification not found');
      notification.read = true;
      persist();
      return { success: true, notification: clone(notification) };
    },
    readAllNotifications() {
      state.notifications.forEach((notification) => { notification.read = true; });
      persist();
      return { success: true };
    },

    listChallenges(type) {
      if (!['daily', 'weekly'].includes(type)) throw new FeatureStoreError(400, 'Challenge type must be daily or weekly');
      return clone(state.challenges[type]);
    },
    claimChallenge(id) {
      const allChallenges = [...state.challenges.daily, ...state.challenges.weekly];
      const challenge = allChallenges.find((item) => item.id === id);
      if (!challenge) throw new FeatureStoreError(404, 'Challenge not found');
      if (challenge.claimed) throw new FeatureStoreError(409, 'Challenge reward already claimed');
      if (challenge.progress < challenge.goal) throw new FeatureStoreError(409, 'Challenge is not complete');
      challenge.claimed = true;
      persist();
      return { success: true, challenge: clone(challenge) };
    },
  };
}

function loadState(stateFile) {
  try {
    if (fs.existsSync(stateFile)) return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch (error) {
    console.warn(`[feature-store] Could not load state file: ${error.message}`);
  }
  return createSeedState();
}

module.exports = {
  FeatureStoreError,
  createFeatureStore,
  createSeedState,
};
