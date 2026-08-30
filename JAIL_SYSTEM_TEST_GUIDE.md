# Jail System Test & Monitor Setup

This document explains how to use the separate test/monitor window for the jail time system.

## 📋 Overview

The jail system has been updated with **separate testing and monitoring capabilities**:

1. **Jail System Test Suite** (`test/jail-system-standalone.js`)
   - Validates the complete 81-minute jail cycle
   - Tests user participation, rewards, and timing
   - Run with: `node test/jail-system-standalone.js`

2. **Jail Test Monitor Dashboard** (`frontend/src/pages/jail-test-monitor.tsx`)
   - Real-time monitoring UI for jail cycles
   - Visual timeline and event log
   - Access: http://localhost:3000/jail-test-monitor

3. **Jail Test Suite with Mocha** (`test/jail-system.test.js`)
   - Full test suite for integration testing
   - Run with: `npm test -- test/jail-system.test.js`

## 🕐 Jail Cycle Timeline

| Event | Time | Duration | Status |
|-------|------|----------|--------|
| T+0min | Cycle starts | — | Setup |
| T+69min | ⚠️ Warning emitted | 60 sec | User notification |
| T+70min | 🚨 Jail starts | 10 min | Users can join |
| T+80min | ✓ Jail ends | — | No more joins |
| T+81min | 💰 Rewards sent | — | Points distributed |
| T+82min | Next cycle | 70 min | Repeat |

**Total cycle: 81 minutes (70 + 10 + 1)**

## 🏃 Quick Start

### Run Test Suite

```bash
# Standalone test (no dependencies)
node test/jail-system-standalone.js

# Full mocha test suite
npm test -- test/jail-system.test.js
```

### Access Monitor Dashboard

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Open in browser:
   ```
   http://localhost:3000/jail-test-monitor
   ```

3. Monitor shows:
   - Real-time jail status (active/inactive)
   - Time remaining in current jail session
   - Current user count
   - Cycle progress (0-100%)
   - Event log with timestamps
   - Visual timeline of expected events

## 🧪 Test Coverage

The test suite validates:

✅ **Configuration**
- All timing values are correct (70/60/10/60 minutes/seconds)
- Reward amount per user is 100 points

✅ **Complete Cycle (T+0 to T+81)**
- Warning emitted at T+69min
- Jail starts at T+70min
- Jail ends at T+80min
- Rewards sent at T+81min

✅ **User Participation**
- Users can't join before jail starts
- Users can join during jail
- Multiple users tracked correctly
- User list cleared after rewards

✅ **Edge Cases**
- Handles 0 users (reward = 0)
- Supports multiple sequential cycles
- Exact timing: 81 minutes total

✅ **Timing Validation**
- All event timestamps correct
- Jail state tracked through cycle

## 📊 Event Log

The monitor dashboard logs all events:

```
JAIL_WARNING        → User notified, 60 seconds until start
JAIL_STARTED        → Jail is now active, users can join
JAIL_USER_JOINED    → Player joined jail session
JAIL_ENDED          → Jail period finished
REWARDS_SENT        → Points distributed to participants
```

## 🔍 Debugging

### Check Current Status
```bash
# View live logs from api-server
docker logs safesoundarena-api-server-1 --follow
```

### Test Specific Functionality
- **Warning timing**: Node test runs simulated cycles instantly
- **Real-time monitoring**: Dashboard updates via WebSocket
- **Multiple cycles**: Test suite runs 2 sequential cycles

### Common Issues

| Issue | Solution |
|-------|----------|
| Monitor shows "Disconnected" | Check if api-server is running on port 4000 |
| Tests fail timing validation | Ensure mock timing matches server.js config |
| Event log empty | Wait for next jail cycle or check socket connection |

## 🛠️ Configuration

Edit timing in `server.js`:

```javascript
// Current (70 min cycle, 10 min jail)
const msToNextJail = 70 * 60 * 1000;        // 70 minutes
const jailDurationMs = 10 * 60 * 1000;      // 10 minutes
const warningMs = 60 * 1000;                // Warn 60 sec before
const rewardDelayMs = 60 * 1000;            // 1 min after jail ends
```

Update tests accordingly in `test/jail-system-standalone.js`:

```javascript
const JAIL_CONFIG = {
  cycleLengthMs: 70 * 60 * 1000,      // ← Update here
  warningBeforeMs: 60 * 1000,         // ← Update here
  jailDurationMs: 10 * 60 * 1000,     // ← Update here
  rewardDelayAfterMs: 60 * 1000,      // ← Update here
};
```

## 📈 Monitoring Production

For production monitoring in a separate window:

1. **Open jail-test-monitor.tsx in dedicated browser tab**
   - Keep monitor window open alongside main app
   - Watch real-time cycle progression
   - See all events as they occur

2. **Use Docker logs**
   ```bash
   docker logs safesoundarena-api-server-1 | grep -i jail
   ```

3. **Check database for rewards**
   - Query user points after jail ends
   - Verify only participants received rewards

## 📝 Test Output Example

```
✓ Test 1: Should have correct timing values
✓ Test 2: Should emit warning at T+69min
✓ Test 3: Should start jail at T+70min
✓ Test 4: Should end jail at T+80min (after 10 minutes)
✓ Test 5: Should send rewards at T+81min
...
📊 TEST SUMMARY
Total Tests: 12
✓ Passed: 12
✗ Failed: 0
Success Rate: 100.0%
```

## 🎯 Next Steps

1. ✅ Run standalone tests: `node test/jail-system-standalone.js`
2. ✅ Open monitor dashboard: http://localhost:3000/jail-test-monitor
3. ✅ Watch one complete cycle (81 minutes)
4. ✅ Verify events logged correctly
5. ✅ Check rewards distributed

---

**Created**: August 8, 2026  
**System**: SafeSoundArena Jail Time  
**Version**: 1.0
