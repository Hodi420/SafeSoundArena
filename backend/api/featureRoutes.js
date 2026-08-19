const express = require('express');
const { FeatureStoreError, createFeatureStore } = require('./featureStore');

function createFeatureRouter(options = {}) {
  const router = express.Router();
  const store = options.store || createFeatureStore(options);
  const isProduction = process.env.NODE_ENV === 'production';
  const onMutation = typeof options.onMutation === 'function' ? options.onMutation : null;

  function userId(req) {
    const id = req.headers['x-user-id'] || req.headers['x-user'];
    if (typeof id === 'string' && id.trim()) return id.trim();
    if (!isProduction) return 'demo-user';
    throw new FeatureStoreError(401, 'X-User-Id is required for feature mutations');
  }

  function mutationActor(req) {
    const id = req.headers['x-user-id'] || req.headers['x-user'] || (isProduction ? 'unknown' : 'demo-user');
    return { type: 'user', id: String(id).slice(0, 128) };
  }

  function run(handler, eventFactory = null) {
    return async (req, res) => {
      try {
        const result = await handler(req);
        if (onMutation && eventFactory) {
          let eventDelivery;
          try {
            eventDelivery = await onMutation(eventFactory(req, result));
          } catch (error) {
            eventDelivery = {
              status: 'failed',
              error: {
                code: error.code || 'MSHIX_EVENT_DELIVERY_FAILED',
                message: String(error.message || 'MSHIX event delivery failed').slice(0, 256),
              },
            };
            console.error('[feature-api] MSHIX event delivery failed:', error.message);
          }
          if (eventDelivery) {
            return res.json({ ...result, eventDelivery });
          }
        }
        return res.json(result);
      } catch (error) {
        if (error instanceof FeatureStoreError) {
          return res.status(error.status).json({ error: error.message });
        }
        console.error('[feature-api] unexpected error:', error);
        return res.status(500).json({ error: 'Internal feature API error' });
      }
    };
  }

  router.get('/events', run(() => store.listEvents()));
  router.post('/events/:eventId/join', run(
    (req) => store.joinEvent(req.params.eventId, userId(req)),
    (req, result) => ({
      type: 'feature.event.joined',
      source: 'feature-api',
      actor: mutationActor(req),
      payload: { eventId: req.params.eventId, joined: result.joined === true },
    })
  ));
  router.post('/events/:eventId/leave', run(
    (req) => store.leaveEvent(req.params.eventId, userId(req)),
    (req) => ({
      type: 'feature.event.left',
      source: 'feature-api',
      actor: mutationActor(req),
      payload: { eventId: req.params.eventId },
    })
  ));

  router.get('/marketplace', run(() => store.listMarketplace()));
  router.post('/marketplace/buy/:itemId', run(
    (req) => store.buyItem(req.params.itemId),
    (req) => ({
      type: 'marketplace.item.bought',
      source: 'feature-api',
      actor: mutationActor(req),
      payload: { itemId: req.params.itemId },
    })
  ));
  router.post('/marketplace/sell/:itemId', run(
    (req) => store.sellItem(req.params.itemId, req.body?.quantity, req.body?.price),
    (req) => ({
      type: 'marketplace.item.sold',
      source: 'feature-api',
      actor: mutationActor(req),
      payload: { itemId: req.params.itemId, quantity: req.body?.quantity, price: req.body?.price },
    })
  ));

  router.get('/quests', run(() => store.listQuests()));
  router.get('/quests/:questId', run((req) => store.getQuest(req.params.questId)));
  router.post('/quests/:questId/progress', run(
    (req) => store.updateQuestProgress(req.params.questId, req.body?.progress),
    (req) => ({
      type: 'quest.progress.updated',
      source: 'feature-api',
      actor: mutationActor(req),
      payload: { questId: req.params.questId, progress: req.body?.progress },
    })
  ));

  router.get('/guilds', run(() => store.listGuilds()));
  router.get('/guilds/:guildId', run((req) => store.getGuild(req.params.guildId)));
  router.post('/guilds/:guildId/join', run(
    (req) => store.joinGuild(req.params.guildId, userId(req)),
    (req) => ({
      type: 'guild.member.joined',
      source: 'feature-api',
      actor: mutationActor(req),
      payload: { guildId: req.params.guildId },
    })
  ));
  router.post('/guilds/:guildId/leave', run(
    (req) => store.leaveGuild(req.params.guildId, userId(req)),
    (req) => ({
      type: 'guild.member.left',
      source: 'feature-api',
      actor: mutationActor(req),
      payload: { guildId: req.params.guildId },
    })
  ));
  router.get('/guilds/:guildId/messages', run((req) => store.listGuildMessages(req.params.guildId)));

  router.get('/notifications', run(() => store.listNotifications()));
  router.post('/notifications/:notificationId/read', run(
    (req) => store.readNotification(req.params.notificationId),
    (req) => ({
      type: 'notification.read',
      source: 'feature-api',
      actor: mutationActor(req),
      payload: { notificationId: req.params.notificationId },
    })
  ));
  router.post('/notifications/read-all', run(
    () => store.readAllNotifications(),
    (req) => ({ type: 'notification.read-all', source: 'feature-api', actor: mutationActor(req), payload: {} })
  ));

  router.get('/challenges/daily', run(() => store.listChallenges('daily')));
  router.get('/challenges/weekly', run(() => store.listChallenges('weekly')));
  router.post('/challenges/:challengeId/claim', run(
    (req) => store.claimChallenge(req.params.challengeId),
    (req) => ({
      type: 'challenge.reward.claimed',
      source: 'feature-api',
      actor: mutationActor(req),
      payload: { challengeId: req.params.challengeId },
    })
  ));

  return router;
}

module.exports = { createFeatureRouter };
