/**
 * Jail Time System Test Suite - Standalone Runner
 * Run with: node test/jail-system-standalone.js
 * No dependencies required
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
    console.log(`  ✓ [${new Date(event.timestamp).toISOString()}] ${eventType}`);
    if (Object.keys(details).length > 0) {
      console.log(`    Details:`, JSON.stringify(details, null, 2));
    }
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
      expectedStartTime: new Date(this.nextJailStartTime).toISOString()
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
      startTime: new Date(this.jailStartTime).toISOString(),
      endTime: new Date(this.jailEndTime).toISOString(),
      durationMinutes: JAIL_CONFIG.jailDurationMs / 60000
    });
  }

  // End jail (T+80min)
  endJail(nowMs = this.currentTime ?? Date.now()) {
    this.jailActive = false;
    this.nextJailEndTime = null;
    this.logEvent('JAIL_ENDED', {
      endTime: new Date(nowMs).toISOString(),
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

// Test utilities
let testCount = 0;
let passCount = 0;
let failCount = 0;

function test(description, fn) {
  testCount++;
  try {
    fn();
    console.log(`✓ Test ${testCount}: ${description}`);
    passCount++;
  } catch (err) {
    console.log(`✗ Test ${testCount}: ${description}`);
    console.log(`  Error: ${err.message}`);
    failCount++;
  }
  console.log('');
}

function describe(suiteName, fn) {
  console.log(`\n📋 ${suiteName}`);
  console.log('='.repeat(60));
  fn();
}

// ========== TESTS ==========

describe('Jail Configuration', () => {
  test('Should have correct timing values', () => {
    assert.strictEqual(JAIL_CONFIG.cycleLengthMs, 70 * 60 * 1000, 'Cycle: 70 min');
    assert.strictEqual(JAIL_CONFIG.warningBeforeMs, 60 * 1000, 'Warning: 60 sec before');
    assert.strictEqual(JAIL_CONFIG.jailDurationMs, 10 * 60 * 1000, 'Duration: 10 min');
    assert.strictEqual(JAIL_CONFIG.rewardDelayAfterMs, 60 * 1000, 'Reward delay: 60 sec');
    assert.strictEqual(JAIL_CONFIG.rewardAmount, 100, 'Reward per user: 100');
  });
});

describe('Complete Jail Cycle (T+0 to T+81min)', () => {
  test('Should emit warning at T+69min', () => {
    const sim = new JailSystemSimulator();
    sim.calculateNextCycleTimes(Date.now());
    
    sim.advanceTime(JAIL_CONFIG.cycleLengthMs - JAIL_CONFIG.warningBeforeMs);
    const warningEvents = sim.events.filter(e => e.type === 'JAIL_WARNING');
    assert.strictEqual(warningEvents.length, 1, 'Warning emitted');
    assert.ok(warningEvents[0].details.message.includes('60 seconds'));
  });

  test('Should start jail at T+70min', () => {
    const sim = new JailSystemSimulator();
    sim.calculateNextCycleTimes(Date.now());
    
    assert.strictEqual(sim.jailActive, false, 'Not active yet');
    sim.advanceTime(JAIL_CONFIG.cycleLengthMs);
    assert.strictEqual(sim.jailActive, true, 'Jail now active');

    const startEvents = sim.events.filter(e => e.type === 'JAIL_STARTED');
    assert.strictEqual(startEvents.length, 1, 'JAIL_STARTED event emitted');
    assert.ok(startEvents[0].details.durationMinutes === 10);
  });

  test('Should end jail at T+80min (after 10 minutes)', () => {
    const sim = new JailSystemSimulator();
    sim.calculateNextCycleTimes(Date.now());
    
    sim.advanceTime(JAIL_CONFIG.cycleLengthMs);
    assert.strictEqual(sim.jailActive, true);

    sim.advanceTime(JAIL_CONFIG.jailDurationMs);
    assert.strictEqual(sim.jailActive, false, 'Jail ended');

    const endEvents = sim.events.filter(e => e.type === 'JAIL_ENDED');
    assert.strictEqual(endEvents.length, 1, 'JAIL_ENDED event emitted');
  });

  test('Should send rewards at T+81min (60 seconds after jail ends)', () => {
    const sim = new JailSystemSimulator();
    sim.calculateNextCycleTimes(Date.now());
    
    // Start jail cycle
    sim.advanceTime(JAIL_CONFIG.cycleLengthMs);
    assert.strictEqual(sim.jailActive, true);

    // Add users while jail is active
    sim.addUserToJail('player1');
    sim.addUserToJail('player2');

    // End jail
    sim.advanceTime(JAIL_CONFIG.jailDurationMs);
    assert.strictEqual(sim.jailActive, false);

    // Trigger rewards
    sim.advanceTime(JAIL_CONFIG.rewardDelayAfterMs);
    const rewardEvents = sim.events.filter(e => e.type === 'REWARDS_SENT');
    assert.strictEqual(rewardEvents.length, 1, 'REWARDS_SENT event emitted');
    assert.strictEqual(rewardEvents[0].details.userCount, 2, '2 users rewarded');
    assert.strictEqual(rewardEvents[0].details.totalReward, 200, 'Total: 200 points');
  });
});

describe('User Jail Participation', () => {
  test('Should reject user join when jail is not active', () => {
    const sim = new JailSystemSimulator();
    const result = sim.addUserToJail('player1');
    assert.strictEqual(result, false, 'Join rejected');

    const events = sim.events.filter(e => e.type === 'JAIL_USER_JOIN_REJECTED');
    assert.strictEqual(events.length, 1);
  });

  test('Should accept user join when jail is active', () => {
    const sim = new JailSystemSimulator();
    sim.calculateNextCycleTimes(Date.now());
    
    sim.advanceTime(JAIL_CONFIG.cycleLengthMs);
    const result = sim.addUserToJail('player1');
    assert.strictEqual(result, true, 'Join accepted');

    const events = sim.events.filter(e => e.type === 'JAIL_USER_JOINED');
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].details.totalUsers, 1);
  });

  test('Should track multiple users in jail', () => {
    const sim = new JailSystemSimulator();
    sim.calculateNextCycleTimes(Date.now());
    
    sim.advanceTime(JAIL_CONFIG.cycleLengthMs);
    sim.addUserToJail('player1');
    sim.addUserToJail('player2');
    sim.addUserToJail('player3');

    const joinEvents = sim.events.filter(e => e.type === 'JAIL_USER_JOINED');
    assert.strictEqual(joinEvents.length, 3);
    assert.strictEqual(sim.getTimeline().usersInJail, 3);
  });

  test('Should clear users after reward is sent', () => {
    const sim = new JailSystemSimulator();
    sim.calculateNextCycleTimes(Date.now());
    
    sim.addUserToJail('player1');
    sim.advanceTime(JAIL_CONFIG.cycleLengthMs);
    sim.advanceTime(JAIL_CONFIG.jailDurationMs);
    sim.advanceTime(JAIL_CONFIG.rewardDelayAfterMs);

    assert.strictEqual(Object.keys(sim.usersInJail).length, 0, 'Users cleared');
  });
});

describe('Edge Cases', () => {
  test('Should handle no users in jail (reward = 0)', () => {
    const sim = new JailSystemSimulator();
    sim.calculateNextCycleTimes(Date.now());
    
    sim.advanceTime(JAIL_CONFIG.cycleLengthMs);
    sim.advanceTime(JAIL_CONFIG.jailDurationMs);
    sim.advanceTime(JAIL_CONFIG.rewardDelayAfterMs);

    const rewardEvents = sim.events.filter(e => e.type === 'REWARDS_SENT');
    assert.strictEqual(rewardEvents[0].details.userCount, 0);
    assert.strictEqual(rewardEvents[0].details.totalReward, 0);
  });

  test('Should handle multiple cycles in sequence', () => {
    const sim = new JailSystemSimulator();
    sim.calculateNextCycleTimes(Date.now());
    
    // Cycle 1
    sim.advanceTime(JAIL_CONFIG.cycleLengthMs);
    sim.addUserToJail('player1');
    sim.advanceTime(JAIL_CONFIG.jailDurationMs);
    sim.advanceTime(JAIL_CONFIG.rewardDelayAfterMs);

    // Cycle 2
    sim.advanceTime(JAIL_CONFIG.cycleLengthMs);
    sim.addUserToJail('player2');
    sim.advanceTime(JAIL_CONFIG.jailDurationMs);
    sim.advanceTime(JAIL_CONFIG.rewardDelayAfterMs);

    const startEvents = sim.events.filter(e => e.type === 'JAIL_STARTED');
    const rewardEvents = sim.events.filter(e => e.type === 'REWARDS_SENT');
    assert.strictEqual(startEvents.length, 2, '2 jail cycles');
    assert.strictEqual(rewardEvents.length, 2, '2 reward batches');
  });
});

describe('Timing Validation', () => {
  test('Should validate exact timing for complete cycle', () => {
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

// ========== SUMMARY ==========
console.log('\n' + '='.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(60));
console.log(`Total Tests: ${testCount}`);
console.log(`✓ Passed: ${passCount}`);
console.log(`✗ Failed: ${failCount}`);
console.log(`Success Rate: ${((passCount / testCount) * 100).toFixed(1)}%`);
console.log('='.repeat(60));

if (failCount > 0) {
  process.exit(1);
}
