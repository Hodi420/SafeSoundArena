// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

let jailActive = false;
let usersInJail = {}; // { socketId: { username, profile, ... } }
let jailStartTime = null;
let jailEndTime = null;
let scheduledTimeouts = []; // Track timeouts for cleanup

const app = express();
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || ['*'], optionsSuccessStatus: 200 }));
app.use(express.json());
app.use(helmet());

const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: process.env.ALLOWED_ORIGINS?.split(',') || ['*'] } });

// Endpoint to activate/deactivate jail time (admin/manual override)
app.post('/api/jail', rateLimit({ windowMs: 60 * 1000, max: 10 }), (req, res) => {
  const authHeader = req.headers.authorization;
  const token = process.env.ADMIN_TOKEN;
  if (!authHeader || !token) {
    console.log('Missing auth header or ADMIN_TOKEN');
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const headerToken = authHeader.replace('Bearer ', '');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(headerToken), Buffer.from(token))) {
      console.log('Unauthorized /api/jail attempt');
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
  } catch (err) {
    console.log('Token comparison failed:', err.message);
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  jailActive = !!req.body.active;
  console.log(`Jail manually set to ${jailActive}`);
  io.emit('jailStatus', { active: jailActive });
  if (!jailActive) {
    usersInJail = {};
    console.log('Users in jail cleared');
  }
  res.json({ success: true, active: jailActive });
});

// Endpoint for polling fallback
app.get('/api/jail-status', (req, res) => {
  res.json({ active: jailActive });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    jailActive,
    userCount: Object.keys(usersInJail).length,
  });
});

// --- Jail Scheduler ---
function calculateReward(userCount) {
  // Example: quadratic scaling for more excitement
  return Math.floor(100 + 15 * userCount + 0.5 * userCount * userCount);
}

function clearScheduledTimeouts() {
  scheduledTimeouts.forEach(id => clearTimeout(id));
  scheduledTimeouts = [];
}

function scheduleJail() {
  clearScheduledTimeouts(); // Clean up any previous schedule
  const msToNextJail = 70 * 60 * 1000; // 70 minutes

  let t1 = setTimeout(() => {
    console.log('Jail starting soon in 60 seconds');
    io.emit('jailStartingSoon', { in: 60, startTime: Date.now() + 60 * 1000 });

    let t2 = setTimeout(() => {
      jailActive = true;
      jailStartTime = Date.now();
      jailEndTime = jailStartTime + 10 * 60 * 1000;
      console.log('Jail started');
      io.emit('jailStatus', { active: true, startTime: jailStartTime, endTime: jailEndTime });

      let t3 = setTimeout(() => {
        jailActive = false;
        console.log('Jail ended');
        io.emit('jailStatus', { active: false });

        let t4 = setTimeout(() => {
          const userCount = Object.keys(usersInJail).length;
          const reward = calculateReward(userCount);
          console.log(`Sending rewards: ${reward} for ${userCount} users`);
          io.emit('jailReward', { reward, userCount });
          scheduleJail();
        }, 60 * 1000);
        scheduledTimeouts.push(t4);
      }, 10 * 60 * 1000);
      scheduledTimeouts.push(t3);
    }, 60 * 1000);
    scheduledTimeouts.push(t2);
  }, msToNextJail);
  scheduledTimeouts.push(t1);
}

// Call this once at server start
scheduleJail();

io.on('connection', (socket) => {
  // Send current jail status
  socket.emit('jailStatus', { active: jailActive });

  // Join jail room
  socket.on('joinJail', (profile) => {
    usersInJail[socket.id] = profile;
    io.emit('jailUsers', Object.values(usersInJail));
  });

  socket.on('leaveJail', () => {
    delete usersInJail[socket.id];
    io.emit('jailUsers', Object.values(usersInJail));
  });

  socket.on('jailMessage', (msg) => {
    try {
      // Only forward safe string fields; do not spread raw client object
      const safe = {
        text: typeof msg.text === 'string' ? msg.text.slice(0, 500) : '',
        username: typeof msg.username === 'string' ? msg.username.slice(0, 64) : 'anonymous',
        timestamp: Date.now(),
      };
      io.emit('jailMessage', safe);
    } catch (err) {
      console.error('Error broadcasting jailMessage:', err.message);
    }
  });

  socket.on('disconnect', () => {
    delete usersInJail[socket.id];
    io.emit('jailUsers', Object.values(usersInJail));
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Jail server running on http://localhost:${PORT}`));

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  clearScheduledTimeouts();
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  clearScheduledTimeouts();
  server.close(() => process.exit(0));
});
