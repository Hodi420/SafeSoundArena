import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import leaderboardRoutes from './routes/leaderboard.js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// טעינת משתני סביבה
const PORT = process.env.PORT || 3002;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware בסיסי
app.use((req, res, next) => {
  // dev key check (enabled only in dev unless FORCE_DEV_GATE=true)
  const isDev = process.env.NODE_ENV !== 'production' || process.env.FORCE_DEV_GATE === 'true';
  if (isDev) {
    const devKey = req.headers['x-dev-key'];
    const expected = process.env.DEV_ACCESS_TOKEN;
    if (expected && devKey !== expected) {
      return res.status(401).json({ error: 'Unauthorized (dev key missing)' });
    }
  }
  next();
});

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());

// Serve static files from the React app
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In development, serve the frontend from the frontend directory
if (process.env.NODE_ENV === 'development') {
  app.use(express.static(path.join(__dirname, '../frontend/.next')));
}

// API Routes
app.use('/api/leaderboard', leaderboardRoutes);

// All other GET requests not handled before will return our React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/.next/server/pages/index.js'));
});

// בדיקת תקינות שרת
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// טיפול בשגיאות גלובלי
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error: ${err.message}`);
  res.status(500).json({
    error: NODE_ENV === 'development' ? err.message : 'Internal Server Error',
  });
});

// אתחול שרת Socket.io
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running in ${NODE_ENV} mode on port ${PORT}`);
});
