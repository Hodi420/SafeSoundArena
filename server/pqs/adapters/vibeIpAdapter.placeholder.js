const { IpAdapterInterface } = require('./ipAdapter.interface');

class VibeIpAdapterPlaceholder extends IpAdapterInterface {
  constructor(options = {}) {
    super({
      enabled: false,
      platform: 'VIBE IP',
      ...options
    });
  }

  async requestIpLicense(projectDescriptor) {
    this.assertEnabled();
    // Requires official VIBE IP program access and license terms before any IP-backed activation.
    return {
      platform: this.platform,
      projectDescriptor,
      licensed: false,
      mock: true
    };
  }

  async publishMatchResult(matchRecord) {
    this.assertEnabled();
    // Requires approved licensing, settlement, and publication flow before external use.
    return {
      platform: this.platform,
      matchId: matchRecord.matchId,
      published: false,
      mock: true
    };
  }

  async createPreviewReward(reward) {
    this.assertEnabled();
    // Requires official permission before connecting preview rewards to any licensed economy.
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
  VibeIpAdapterPlaceholder
};
