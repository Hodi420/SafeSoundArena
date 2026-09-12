const { IpAdapterInterface } = require('./ipAdapter.interface');

class MsuSdkAdapterPlaceholder extends IpAdapterInterface {
  constructor(options = {}) {
    super({
      enabled: false,
      platform: 'MapleStory Universe',
      ...options
    });
  }

  async getPlayerIdentity(walletOrBuilderUserId) {
    this.assertEnabled();
    // Requires approved MSU Builder status, KYC/KYB where applicable, and live API credentials.
    return {
      platform: this.platform,
      walletOrBuilderUserId,
      officialAccountId: null,
      mock: true
    };
  }

  async publishMatchResult(matchRecord) {
    this.assertEnabled();
    // Requires MSU live app review before any Synergy App or Open API write integration.
    return {
      platform: this.platform,
      matchId: matchRecord.matchId,
      published: false,
      mock: true
    };
  }

  async createPreviewReward(reward) {
    this.assertEnabled();
    // No external token, NFT, marketplace, or tradeable item issuance is allowed here.
    return {
      platform: this.platform,
      reward,
      externalToken: false,
      tradable: false,
      mock: true
    };
  }
}

module.exports = {
  MsuSdkAdapterPlaceholder
};
