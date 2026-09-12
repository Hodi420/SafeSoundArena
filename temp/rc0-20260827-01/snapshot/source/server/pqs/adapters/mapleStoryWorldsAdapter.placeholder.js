const { IpAdapterInterface } = require('./ipAdapter.interface');

class MapleStoryWorldsAdapterPlaceholder extends IpAdapterInterface {
  constructor(options = {}) {
    super({
      enabled: false,
      platform: 'MapleStory Worlds',
      ...options
    });
  }

  async getPlayerIdentity(playerHandle) {
    this.assertEnabled();
    // Requires official MapleStory Worlds authorization before replacing mock identity data.
    return {
      platform: this.platform,
      playerHandle,
      officialAccountId: null,
      mock: true
    };
  }

  async publishMatchResult(matchRecord) {
    this.assertEnabled();
    // Requires platform review and permitted API access before posting results externally.
    return {
      platform: this.platform,
      matchId: matchRecord.matchId,
      published: false,
      mock: true
    };
  }

  async createPreviewReward(reward) {
    this.assertEnabled();
    // Requires explicit permission before mapping preview rewards to any official platform reward.
    return {
      platform: this.platform,
      reward,
      externalToken: false,
      mock: true
    };
  }
}

module.exports = {
  MapleStoryWorldsAdapterPlaceholder
};
