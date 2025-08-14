// --- MCP Permissions API ---
// רשימת כל המשתמשים עם הרשאות
app.get('/api/mcp/users', (req, res) => {
  const mcpPermissions = require('./mcp-permissions');
  res.json({ users: mcpPermissions.getAllUsers() });
});

// הוספת הרשאה למשתמש
app.post('/api/mcp/permissions', (req, res) => {
  const { userId, role } = req.body;
  if (!userId || !role) return res.status(400).json({ error: 'userId and role required' });
  const mcpPermissions = require('./mcp-permissions');
  mcpPermissions.addPermission(userId, role);
  res.json({ success: true, userId, role });
});

// הסרת הרשאה ממשתמש
app.delete('/api/mcp/permissions', (req, res) => {
  const { userId, role } = req.body;
  if (!userId || !role) return res.status(400).json({ error: 'userId and role required' });
  const mcpPermissions = require('./mcp-permissions');
  mcpPermissions.removePermission(userId, role);
  res.json({ success: true, userId, role });
});
// app.js - SafeSoundArena backend bootstrap
// נקודת כניסה ראשית לשרת ולמודולים המרכזיים
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');


// ייבוא מודולים עיקריים (skeleton)
const scrollsEngine = require('./scrolls-engine');
const jailTimeEvents = require('./jailtime-events');
const proofOfActivity = require('./proof-of-activity');
const shameHonorBoards = require('./shame-honor-boards');

// מודול ניהול הרשאות MCP
const mcpPermissions = require('./mcp-permissions');
// דוגמת שימוש: הוספת הרשאות למשתמש (לצורכי פיתוח)
// ניתן להחליף לטעינה מקובץ או DB לפי הצורך
mcpPermissions.addPermission('devUser', 'admin');
mcpPermissions.addPermission('devUser', 'write');
mcpPermissions.addPermission('testUser', 'read');

// דוגמת API לבדיקה
app.get('/api/mcp/permissions/:userId', (req, res) => {
  const { userId } = req.params;
  res.json({ userId, roles: mcpPermissions.getUserRoles(userId) });
});

// דוגמת API לבדוק הרשאה
app.get('/api/mcp/has-permission/:userId/:role', (req, res) => {
  const { userId, role } = req.params;
  res.json({ userId, role, has: mcpPermissions.hasPermission(userId, role) });
});

let jailActive = false;
let usersInJail = {};
let jailStartTime = null;
let jailEndTime = null;

const app = express();
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || ['*'], optionsSuccessStatus: 200 }));
app.use(express.json());
app.use(helmet());

const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

// דוגמה: חיבור API של Jail Time Events
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

app.get('/api/jail-status', (req, res) => {
  res.json({ active: jailActive });
});

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
  return Math.floor(100 + 15 * userCount + 0.5 * userCount * userCount);
}

function scheduleJail() {
  const msToNextJail = 70 * 60 * 1000; // 70 minutes
  setTimeout(() => {
    console.log('Jail starting soon in 60 seconds');
    io.emit('jailStartingSoon', { in: 60, startTime: Date.now() + 60 * 1000 });
    setTimeout(() => {
      jailActive = true;
      jailStartTime = Date.now();
      jailEndTime = jailStartTime + 10 * 60 * 1000;
      console.log('Jail started');
      io.emit('jailStatus', { active: true, startTime: jailStartTime, endTime: jailEndTime });
      setTimeout(() => {
        jailActive = false;
        console.log('Jail ended');
        io.emit('jailStatus', { active: false });
        setTimeout(() => {
          const userCount = Object.keys(usersInJail).length;
          const reward = calculateReward(userCount);
          console.log(`Sending rewards: ${reward} for ${userCount} users`);
          io.emit('jailReward', { reward, userCount });
        }, 60 * 1000);
        scheduleJail();
      }, 10 * 60 * 1000);
    }, 60 * 1000);
  }, msToNextJail);
}

scheduleJail();

io.on('connection', (socket) => {
  socket.emit('jailStatus', { active: jailActive });
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
server.listen(PORT, () => console.log(`SafeSoundArena backend running on http://localhost:${PORT}`));
