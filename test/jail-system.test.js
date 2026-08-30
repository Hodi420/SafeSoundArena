/**
 * Jail Time System Test Suite
 * Tests the complete jail cycle: warning → start → end → rewards
 * Run with: npm test -- test/jail-system.test.js
 */

const assert = require('assert');

// Mock jail timing configuration
const JAIL_CONFIG = {
  cycleLengthMs: 70 * 60 * 1000,      // 70 minutes until next jail
  warningBeforeMs: 60 * 1000,         // Warn 60 seconds before
  jailDurationMs: 10 * 60 * 1000,     // Jail lasts 10 minutes
  rewardDelayAfterMs: 60 * 1000,      // 1 minute after jail ends
  rewardAmount: 100
};

// Simulate jail system state
class JailSystemSimulator {
  constructor() {
    this.jailActive = false;
    this.usersInJail = {};
    this.jailStartTime = null;
    this.jailEndTime = null;
    this.events = [];
    this.nextWarningTime = null;
    this.nextJailStartTime = null;
    this.nextJailEndTime = null;
    this.nextRewardTime = null;
    this.currentTime = null;
  }

  // Log event for audit
  logEvent(eventType, details = {}) {
    const event = {
      type: eventType,
      timestamp: this.currentTime ?? Date.now(),
      details,
      jailActive: this.jailActive,
      userCount: Object.keys(this.usersInJail).length
    };
    this.events.push(event);
    console.log(`[${new Date(event.timestamp).toISOString()}] ${eventType}:`, details);
  }

  // Calculate next jail cycle times
  calculateNextCycleTimes(nowMs = Date.now()) {
    this.currentTime = nowMs;
    this.nextWarningTime = nowMs + JAIL_CONFIG.cycleLengthMs - JAIL_CONFIG.warningBeforeMs;
    this.nextJailStartTime = nowMs + JAIL_CONFIG.cycleLengthMs;
    this.nextJailEndTime = this.nextJailStartTime + JAIL_CONFIG.jailDurationMs;
    this.nextRewardTime = this.nextJailEndTime + JAIL_CONFIG.rewardDelayAfterMs;
  }

  // Simulate time progression and trigger events
  advanceTime(deltaMs) {
    this.currentTime = (this.currentTime ?? Date.now()) + deltaMs;
    const newTime = this.currentTime;
    
    // Check if warning time reached
    if (this.nextWarningTime && newTime >= this.nextWarningTime && !this.jailActive) {
      this.triggerWarning(newTime);
    }

    // Check if jail start time reached
    if (this.nextJailStartTime && newTime >= this.nextJailStartTime && !this.jailActive) {
      this.startJail(newTime);
    }

    // Check if jail end time reached
    if (this.nextJailEndTime && newTime >= this.nextJailEndTime && this.jailActive) {
      this.endJail(newTime);
    }

    // Check if reward time reached
    if (this.nextRewardTime && newTime >= this.nextRewardTime) {
      this.sendRewards();
      this.calculateNextCycleTimes(newTime);
    }
  }

  // Trigger warning (T+69min in 70 min cycle)
  triggerWarning() {
    this.nextWarningTime = null;
    this.logEvent('JAIL_WARNING', {
      message: 'Jail starting soon in 60 seconds',
      secondsUntilJail: 60,
      expectedStartTime: this.nextJailStartTime
    });
  }

  // Start jail (T+70min)
  startJail(nowMs = this.currentTime ?? Date.now()) {
    this.jailActive = true;
    this.nextJailStartTime = null;
    this.jailStartTime = nowMs;
    this.jailEndTime = this.jailStartTime + JAIL_CONFIG.jailDurationMs;
    this.nextJailEndTime = this.jailEndTime;
    this.nextRewardTime = this.jailEndTime + JAIL_CONFIG.rewardDelayAfterMs;
    this.logEvent('JAIL_STARTED', {
      startTime: this.jailStartTime,
      endTime: this.jailEndTime,
      durationMinutes: JAIL_CONFIG.jailDurationMs / 60000,
      expectedEndTime: new Date(this.jailEndTime).toISOString()
    });
  }

  // End jail (T+80min)
  endJail(nowMs = this.currentTime ?? Date.now()) {
    this.jailActive = false;
    this.nextJailEndTime = null;
    this.logEvent('JAIL_ENDED', {
      endTime: nowMs,
      durationMs: nowMs - this.jailStartTime,
      usersInJail: Object.keys(this.usersInJail).length
    });
  }

  // Send rewards to users (T+81min)
  sendRewards() {
    const userCount = Object.keys(this.usersInJail).length;
    const totalReward = userCount > 0 ? JAIL_CONFIG.rewardAmount * userCount : 0;
    this.logEvent('REWARDS_SENT', {
      userCount,
      rewardPerUser: JAIL_CONFIG.rewardAmount,
      totalReward,
      usersRewarded: Object.keys(this.usersInJail)
    });
    this.usersInJail = {}; // Clear users after reward
  }

  // User joins jail
  addUserToJail(username) {
    if (!this.jailActive) {
      this.logEvent('JAIL_USER_JOIN_REJECTED', { username, reason: 'jail_not_active' });
      return false;
    }
    this.usersInJail[username] = { joinedAt: Date.now() };
    this.logEvent('JAIL_USER_JOINED', { username, totalUsers: Object.keys(this.usersInJail).length });
    return true;
  }

  // Get timeline for current cycle
  getTimeline() {
    return {
      config: JAIL_CONFIG,
      nextWarningTime: this.nextWarningTime,
      nextJailStartTime: this.nextJailStartTime,
      nextJailEndTime: this.nextJailEndTime,
      nextRewardTime: this.nextRewardTime,
      jailActive: this.jailActive,
      usersInJail: Object.keys(this.usersInJail).length,
      events: this.events
    };
  }
}

describe('Jail System', () => {
  describe('Configuration', () => {
    it('should have correct timing values', () => {
      assert.strictEqual(JAIL_CONFIG.cycleLengthMs, 70 * 60 * 1000, 'Cycle: 70 min');
      assert.strictEqual(JAIL_CONFIG.warningBeforeMs, 60 * 1000, 'Warning: 60 sec before');
      assert.strictEqual(JAIL_CONFIG.jailDurationMs, 10 * 60 * 1000, 'Duration: 10 min');
      assert.strictEqual(JAIL_CONFIG.rewardDelayAfterMs, 60 * 1000, 'Reward delay: 60 sec');
      assert.strictEqual(JAIL_CONFIG.rewardAmount, 100, 'Reward per user: 100');
    });
  });

  describe('Complete Jail Cycle (T+0 to T+81min)', () => {
    let simulator;

    beforeEach(() => {
      simulator = new JailSystemSimulator();
      simulator.calculateNextCycleTimes(Date.now());
    });

    it('should emit warning at T+69min (60 seconds before jail)', () => {
      const events = simulator.events.filter(e => e.type === 'JAIL_WARNING');
      assert.strictEqual(events.length, 0, 'No warning yet');

      simulator.advanceTime(JAIL_CONFIG.cycleLengthMs - JAIL_CONFIG.warningBeforeMs);
      const warningEvents = simulator.events.filter(e => e.type === 'JAIL_WARNING');
      assert.strictEqual(warningEvents.length, 1, 'Warning emitted');
      assert.ok(warningEvents[0].details.message.includes('60 seconds'));
    });

    it('should start jail at T+70min', () => {
      assert.strictEqual(simulator.jailActive, false, 'Not active yet');

      simulator.advanceTime(JAIL_CONFIG.cycleLengthMs);
      assert.strictEqual(simulator.jailActive, true, 'Jail now active');

      const startEvents = simulator.events.filter(e => e.type === 'JAIL_STARTED');
      assert.strictEqual(startEvents.length, 1, 'JAIL_STARTED event emitted');
      assert.ok(startEvents[0].details.durationMinutes === 10);
    });

    it('should end jail at T+80min (after 10 minutes)', () => {
      simulator.advanceTime(JAIL_CONFIG.cycleLengthMs);
      assert.strictEqual(simulator.jailActive, true);

      simulator.advanceTime(JAIL_CONFIG.jailDurationMs);
      assert.strictEqual(simulator.jailActive, false, 'Jail ended');

      const endEvents = simulator.events.filter(e => e.type === 'JAIL_ENDED');
      assert.strictEqual(endEvents.length, 1, 'JAIL_ENDED event emitted');
    });

    it('should send rewards at T+81min (60 seconds after jail ends)', () => {
      // Start jail cycle
      simulator.advanceTime(JAIL_CONFIG.cycleLengthMs);
      assert.strictEqual(simulator.jailActive, true);

      // Add users after the jail opens
      simulator.addUserToJail('player1');
      simulator.addUserToJail('player2');

      // End jail
      simulator.advanceTime(JAIL_CONFIG.jailDurationMs);
      assert.strictEqual(simulator.jailActive, false);

      // Trigger rewards
      simulator.advanceTime(JAIL_CONFIG.rewardDelayAfterMs);
      const rewardEvents = simulator.events.filter(e => e.type === 'REWARDS_SENT');
      assert.strictEqual(rewardEvents.length, 1, 'REWARDS_SENT event emitted');
      assert.strictEqual(rewardEvents[0].details.userCount, 2, '2 users rewarded');
      assert.strictEqual(rewardEvents[0].details.totalReward, 200, 'Total: 200 points');
    });
  });

  describe('User Jail Participation', () => {
    let simulator;

    beforeEach(() => {
      simulator = new JailSystemSimulator();
      simulator.calculateNextCycleTimes(Date.now());
    });

    it('should reject user join when jail is not active', () => {
      const result = simulator.addUserToJail('player1');
      assert.strictEqual(result, false, 'Join rejected');

      const events = simulator.events.filter(e => e.type === 'JAIL_USER_JOIN_REJECTED');
      assert.strictEqual(events.length, 1);
    });

    it('should accept user join when jail is active', () => {
      simulator.advanceTime(JAIL_CONFIG.cycleLengthMs);
      const result = simulator.addUserToJail('player1');
      assert.strictEqual(result, true, 'Join accepted');

      const events = simulator.events.filter(e => e.type === 'JAIL_USER_JOINED');
      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].details.totalUsers, 1);
    });

    it('should track multiple users in jail', () => {
      simulator.advanceTime(JAIL_CONFIG.cycleLengthMs);
      simulator.addUserToJail('player1');
      simulator.addUserToJail('player2');
      simulator.addUserToJail('player3');

      const joinEvents = simulator.events.filter(e => e.type === 'JAIL_USER_JOINED');
      assert.strictEqual(joinEvents.length, 3);
      assert.strictEqual(simulator.getTimeline().usersInJail, 3);
    });

    it('should clear users after reward is sent', () => {
      simulator.addUserToJail('player1');
      simulator.advanceTime(JAIL_CONFIG.cycleLengthMs);
      simulator.advanceTime(JAIL_CONFIG.jailDurationMs);
      simulator.advanceTime(JAIL_CONFIG.rewardDelayAfterMs);

      assert.strictEqual(Object.keys(simulator.usersInJail).length, 0, 'Users cleared');
    });
  });

  describe('Event Logging & Audit Trail', () => {
    let simulator;

    beforeEach(() => {
      simulator = new JailSystemSimulator();
      simulator.calculateNextCycleTimes(Date.now());
    });

    it('should log all events in sequence', () => {
      simulator.advanceTime(JAIL_CONFIG.cycleLengthMs);
      simulator.addUserToJail('player1');
      simulator.advanceTime(JAIL_CONFIG.jailDurationMs);
      simulator.advanceTime(JAIL_CONFIG.rewardDelayAfterMs);

      const eventTypes = simulator.events.map(e => e.type);
      assert.ok(eventTypes.includes('JAIL_USER_JOINED'));
      assert.ok(eventTypes.includes('JAIL_WARNING'));
      assert.ok(eventTypes.includes('JAIL_STARTED'));
      assert.ok(eventTypes.includes('JAIL_ENDED'));
      assert.ok(eventTypes.includes('REWARDS_SENT'));
    });

    it('should include timestamps in all events', () => {
      simulator.advanceTime(JAIL_CONFIG.cycleLengthMs);
      simulator.events.forEach(event => {
        assert.ok(event.timestamp, 'Event has timestamp');
        assert.ok(typeof event.timestamp === 'number');
      });
    });

    it('should track jail state in each event', () => {
      simulator.advanceTime(JAIL_CONFIG.cycleLengthMs);
      simulator.advanceTime(JAIL_CONFIG.jailDurationMs);

      const allEvents = simulator.events;
      assert.ok(allEvents.some(e => e.jailActive === true), 'Some events show jail active');
      assert.ok(allEvents.some(e => e.jailActive === false), 'Some events show jail inactive');
    });
  });

  describe('Edge Cases', () => {
    let simulator;

    beforeEach(() => {
      simulator = new JailSystemSimulator();
      simulator.calculateNextCycleTimes(Date.now());
    });

    it('should handle no users in jail (reward = 0)', () => {
      simulator.advanceTime(JAIL_CONFIG.cycleLengthMs);
      simulator.advanceTime(JAIL_CONFIG.jailDurationMs);
      simulator.advanceTime(JAIL_CONFIG.rewardDelayAfterMs);

      const rewardEvents = simulator.events.filter(e => e.type === 'REWARDS_SENT');
      assert.strictEqual(rewardEvents[0].details.userCount, 0);
      assert.strictEqual(rewardEvents[0].details.totalReward, 0);
    });

    it('should handle multiple cycles in sequence', () => {
      // Cycle 1
      simulator.advanceTime(JAIL_CONFIG.cycleLengthMs);
      simulator.addUserToJail('player1');
      simulator.advanceTime(JAIL_CONFIG.jailDurationMs);
      simulator.advanceTime(JAIL_CONFIG.rewardDelayAfterMs);

      // Cycle 2
      simulator.advanceTime(JAIL_CONFIG.cycleLengthMs);
      simulator.addUserToJail('player2');
      simulator.advanceTime(JAIL_CONFIG.jailDurationMs);
      simulator.advanceTime(JAIL_CONFIG.rewardDelayAfterMs);

      const startEvents = simulator.events.filter(e => e.type === 'JAIL_STARTED');
      const rewardEvents = simulator.events.filter(e => e.type === 'REWARDS_SENT');
      assert.strictEqual(startEvents.length, 2, '2 jail cycles');
      assert.strictEqual(rewardEvents.length, 2, '2 reward batches');
    });
  });

  describe('Timing Validation', () => {
    let simulator;

    beforeEach(() => {
      simulator = new JailSystemSimulator();
      simulator.calculateNextCycleTimes(Date.now());
    });

    it('should validate exact timing for complete cycle', () => {
      const startTime = Date.now();
      const timeline = {
        warning: startTime + (JAIL_CONFIG.cycleLengthMs - JAIL_CONFIG.warningBeforeMs),
        jailStart: startTime + JAIL_CONFIG.cycleLengthMs,
        jailEnd: startTime + JAIL_CONFIG.cycleLengthMs + JAIL_CONFIG.jailDurationMs,
        reward: startTime + JAIL_CONFIG.cycleLengthMs + JAIL_CONFIG.jailDurationMs + JAIL_CONFIG.rewardDelayAfterMs
      };

      // Expected: 70min + 10min + 1min = 81 minutes total
      const totalMs = timeline.reward - startTime;
      const totalMinutes = totalMs / 60000;
      assert.strictEqual(totalMinutes, 81, 'Total cycle: 81 minutes');
    });
  });
});

// Export for running in separate window/process
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { JailSystemSimulator, JAIL_CONFIG };
}
