// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

let jailActive = false;
let usersInJail = {}; // { socketId: { username, profile, ... } }
let jailStartTime = null;
let jailEndTime = null;

const app = express();
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || ['*'], optionsSuccessStatus: 200 }));
app.use(express.json());
app.use(helmet());

const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

// Endpoint to activate/deactivate jail time (admin/manual override)
app.post('/api/jail', rateLimit({ windowMs: 60 * 1000, max: 10 }), (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    console.log('Unauthorized /api/jail attempt');
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

function scheduleJail() {
  // 70 min interval, 10 min jail, 1 min before/after
  const msToNextJail = 70 * 60 * 1000; // 70 minutes
  setTimeout(() => {
    // 1 min before jail
    console.log('Jail starting soon in 60 seconds');
    io.emit('jailStartingSoon', { in: 60, startTime: Date.now() + 60 * 1000 }); // including timestamp
    setTimeout(() => {
      // Jail starts
      jailActive = true;
      jailStartTime = Date.now();
      jailEndTime = jailStartTime + 10 * 60 * 1000; // 10 min
      console.log('Jail started');
      io.emit('jailStatus', { active: true, startTime: jailStartTime, endTime: jailEndTime });
      // End jail after 10 min
      setTimeout(() => {
        jailActive = false;
        console.log('Jail ended');
        io.emit('jailStatus', { active: false });
        // 1 min after jail ends, send rewards
        setTimeout(() => {
          const userCount = Object.keys(usersInJail).length;
          const reward = calculateReward(userCount);
          console.log(`Sending rewards: ${reward} for ${userCount} users`);
          io.emit('jailReward', { reward, userCount });
        }, 60 * 1000);
        // Schedule next jail session
        scheduleJail();
      }, 10 * 60 * 1000);
    }, 60 * 1000);
  }, msToNextJail);
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
    io.emit('jailMessage', { ...msg, timestamp: Date.now() });
  });

  socket.on('disconnect', () => {
    delete usersInJail[socket.id];
    io.emit('jailUsers', Object.values(usersInJail));
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Jail server running on http://localhost:${PORT}`));
