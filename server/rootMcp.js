const express = require('express');
const fetch = require('node-fetch');
const config = require('./mcp-config.json');
const connectDB = require('./db');
const User = require('./models/user');
const Task = require('./models/task');
const Notification = require('./models/notification');
const Agent = require('./models/agent');
const Hierarchy = require('./models/hierarchy');
const { sendMail } = require('./mailer');
const app = express();
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const authRoutes = require('./routes/authRoutes');

app.use('/api', leaderboardRoutes);
app.use('/api/auth', authRoutes);
app.use(express.json());

// Connect to MongoDB
connectDB();
// קבלת סטטוס מכל Mini-MCP ו-Agents בודדים
app.get('/api/root/overview', async (req, res) => {
  const miniMcpStatuses = await Promise.all(config.miniMCPs.map(async mcp => {
    try {
      const r = await fetch(mcp.url + '/api/mcp/overview');
      const status = await r.json();
      return { ...mcp, status };
    } catch {
      return { ...mcp, status: 'offline' };
    }
  }));
  // סטטוס של Agents בודדים
  const standaloneStatuses = await Promise.all(config.standaloneAgents.map(async agent => {
    try {
      const r = await fetch(agent.url + '/healthz');
      const status = await r.json();
      return { ...agent, status: status.status };
    } catch {
      return { ...agent, status: 'offline' };
    }
  }));
  res.json({ miniMcpStatuses, standaloneStatuses });
});

// הקצאת משימה ל-Mini-MCP או Agent בודד
app.post('/api/root/assign', async (req, res) => {
  const { targetType, targetName, command } = req.body;
  if (targetType === 'miniMCP') {
    const mcp = config.miniMCPs.find(m => m.name === targetName);
    if (!mcp) return res.status(404).json({error:'Mini-MCP not found'});
    try {
      const r = await fetch(mcp.url + '/api/mcp/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });
      const data = await r.json();
      return res.json({ ok: true, response: data });
    } catch {
      return res.status(500).json({ error: 'Mini-MCP unreachable' });
    }
  } else if (targetType === 'agent') {
    const agent = config.standaloneAgents.find(a => a.name === targetName);
    if (!agent) return res.status(404).json({error:'Agent not found'});
    try {
      const r = await fetch(agent.url + '/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });
      const data = await r.json();
      return res.json({ ok: true, response: data });
    } catch {
      return res.status(500).json({ error: 'Agent unreachable' });
    }
  }
  res.status(400).json({error:'Invalid targetType'});
});

// Update user notification email preferences
app.put('/api/root/user-email-preferences/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.preferences.notificationEmails = {
      ...user.preferences.notificationEmails,
      ...req.body // expected: { onboarding, notification, system, task }
    };
    await user.save();
    res.json({ ok: true, notificationEmails: user.preferences.notificationEmails });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update preferences', details: err.message });
  }
});

// זיכרון אישי למשתמש (API)
// Onboarding - user registration (required before access)
app.post('/api/root/user-register', async (req, res) => {
  try {
    const { userId, name, email, password, agree, preferences } = req.body;
    if (!userId || !name || !email || !password || !agree) return res.status(400).json({ error: 'Missing required fields' });
    const existing = await User.findOne({ $or: [ { userId }, { email } ] });
    if (existing) return res.status(409).json({ error: 'User already exists or email in use' });
    const user = new User({ userId, name, email, password, preferences, agree, onboardingComplete: true });
    await user.save();
    // Always send onboarding email (non-blocking)
    sendMail({
      to: email,
      subject: 'ברוך הבא ל-SafeSoundArena',
      text: `שלום ${name},\nההרשמה שלך הושלמה בהצלחה!`,
      html: `<h2>שלום ${name},</h2><p>ההרשמה שלך הושלמה בהצלחה!</p>`
    }).catch(e => console.error('Mail error:', e.message));
    res.json({ ok: true, userId });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed', details: err.message });
  }
});

// Admin endpoints (protected, simple demo)
app.get('/api/admin/users', async (req, res) => {
  const token = req.headers['x-admin-token'];
  if (token !== process.env.ADMIN_TOKEN) return res.status(403).json({ error: 'Forbidden' });
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users', details: err.message });
  }
});

// Update user memory/context
app.post('/api/root/user-memory/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user) return res.status(404).json({ error: 'User not found' });
    Object.assign(user, req.body);
    await user.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user', details: err.message });
  }
});

// Get user memory/context
app.get('/api/root/user-memory/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId }, '-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user', details: err.message });
  }
});

// --------- TASK API ---------
// List all tasks for a user
app.get('/api/root/tasks/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user || !user.onboardingComplete) return res.status(403).json({ error: 'User not authorized' });
    const tasks = await Task.find({ userId: req.params.userId });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tasks', details: err.message });
  }
});
// Create a new task
app.post('/api/root/tasks/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user || !user.onboardingComplete) return res.status(403).json({ error: 'User not authorized' });
    const { title, description, agentId } = req.body;
    if (!title) return res.status(400).json({ error: 'Missing title' });
    const task = new Task({ userId: req.params.userId, title, description, agentId });
    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create task', details: err.message });
  }
});
// Update a task
app.put('/api/root/tasks/:userId/:taskId', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user || !user.onboardingComplete) return res.status(403).json({ error: 'User not authorized' });
    const task = await Task.findOneAndUpdate({ _id: req.params.taskId, userId: req.params.userId }, req.body, { new: true });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task', details: err.message });
  }
});
// Delete a task
app.delete('/api/root/tasks/:userId/:taskId', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user || !user.onboardingComplete) return res.status(403).json({ error: 'User not authorized' });
    const task = await Task.findOneAndDelete({ _id: req.params.taskId, userId: req.params.userId });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task', details: err.message });
  }
});

// --------- NOTIFICATION API ---------
// List notifications for a user
app.get('/api/root/notifications/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user || !user.onboardingComplete) return res.status(403).json({ error: 'User not authorized' });
    const notifications = await Notification.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications', details: err.message });
  }
});
// Create a notification for a user
app.post('/api/root/notifications/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user || !user.onboardingComplete) return res.status(403).json({ error: 'User not authorized' });
    const { type, message } = req.body;
    if (!type || !message) return res.status(400).json({ error: 'Missing type or message' });
    const notification = new Notification({ userId: req.params.userId, type, message });
    await notification.save();
    // Try to send email notification (non-blocking, only if enabled)
    try {
      const notifUser = await User.findOne({ userId: req.params.userId });
      if (notifUser && notifUser.email) {
        const pref = notifUser.preferences?.notificationEmails || {};
        // Always send onboarding, otherwise check type
        if (
          type === 'onboarding' && pref.onboarding !== false ||
          type === 'notification' && pref.notification === true ||
          type === 'system' && pref.system === true ||
          type === 'task' && pref.task === true
        ) {
          sendMail({
            to: notifUser.email,
            subject: `התראה חדשה: ${type}`,
            text: message,
            html: `<h3>התראה חדשה</h3><p>${message}</p>`
          }).catch(e => console.error('Mail error:', e.message));
        }
      }
    } catch(e) { console.error('Mail error:', e.message); }
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create notification', details: err.message });
  }
});
// Mark notification as read
app.put('/api/root/notifications/:userId/:notifId/read', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user || !user.onboardingComplete) return res.status(403).json({ error: 'User not authorized' });
    const notification = await Notification.findOneAndUpdate({ _id: req.params.notifId, userId: req.params.userId }, { read: true }, { new: true });
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification', details: err.message });
  }
});

// --------- HIERARCHY API ---------
app.get('/api/root/hierarchy', async (req, res) => {
  try {
    const hierarchy = await Hierarchy.findOne();
    res.json(hierarchy || {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch hierarchy', details: err.message });
  }
});

// --------- TOP USERS BY TASKS API ---------
app.get('/api/root/top-users-tasks-stats', async (req, res) => {
  try {
    // Get users who agreed
    const users = await User.find({ agree: true }, 'userId');
    // For each user, count total and completed tasks
    const stats = await Promise.all(users.map(async u => {
      const totalTasks = await Task.countDocuments({ userId: u.userId });
      const completedTasks = await Task.countDocuments({ userId: u.userId, status: 'done' });
      return {
        user: u.userId.slice(-6), // anonymized (last 6 chars)
        totalTasks,
        completedTasks
      };
    }));
    // Sort by totalTasks desc, take top 10
    stats.sort((a, b) => b.totalTasks - a.totalTasks);
    res.json(stats.slice(0, 10));
  } catch (err) {
    res.status(500).json({ error: 'Failed to get top users', details: err.message });
  }
});

// --------- STATS API ---------
app.get('/api/root/stats', async (req, res) => {
  try {
    const users = await User.countDocuments();
    const tasks = await Task.countDocuments();
    const agents = await Agent.countDocuments();
    res.json({ users, tasks, agents });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats', details: err.message });
  }
});

// --------- ADMIN USER MANAGEMENT ---------
// Block user
app.post('/api/admin/users/:userId/block', async (req, res) => {
  const token = req.headers['x-admin-token'];
  if (token !== process.env.ADMIN_TOKEN) return res.status(403).json({ error: 'Forbidden' });
  try {
    const user = await User.findOneAndUpdate({ userId: req.params.userId }, { blocked: true }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to block user', details: err.message });
  }
});
// Delete user
app.delete('/api/admin/users/:userId', async (req, res) => {
  const token = req.headers['x-admin-token'];
  if (token !== process.env.ADMIN_TOKEN) return res.status(403).json({ error: 'Forbidden' });
  try {
    const user = await User.findOneAndDelete({ userId: req.params.userId });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user', details: err.message });
  }
});
// Promote user to admin
app.post('/api/admin/users/:userId/promote', async (req, res) => {
  const token = req.headers['x-admin-token'];
  if (token !== process.env.ADMIN_TOKEN) return res.status(403).json({ error: 'Forbidden' });
  try {
    const user = await User.findOneAndUpdate({ userId: req.params.userId }, { isAdmin: true }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to promote user', details: err.message });
  }
});

app.listen(3009, () => console.log('Root MCP running on port 3009'));
