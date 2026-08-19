/**
 * Official platform IP adapter contract for PQS.
 *
 * Implementations must stay disabled until the project has written platform
 * approval, active API credentials, content review clearance, and permission
 * to use any platform IP, SDK, identity, economy, or publishing surface.
 */
class IpAdapterInterface {
  constructor({ enabled = false, platform = 'unconfigured' } = {}) {
    this.enabled = Boolean(enabled);
    this.platform = platform;
  }

  isEnabled() {
    return this.enabled;
  }

  getPlatform() {
    return this.platform;
  }

  assertEnabled() {
    if (!this.enabled) {
      throw new Error(`${this.platform} adapter is disabled. Official permission and credentials are required before activation.`);
    }
  }

  async getPlayerIdentity() {
    this.assertEnabled();
    throw new Error('getPlayerIdentity must be implemented by an approved official adapter.');
  }

  async publishMatchResult() {
    this.assertEnabled();
    throw new Error('publishMatchResult must be implemented by an approved official adapter.');
  }

  async createPreviewReward() {
    this.assertEnabled();
    throw new Error('createPreviewReward must be implemented by an approved official adapter.');
  }
}

module.exports = {
  IpAdapterInterface
};
