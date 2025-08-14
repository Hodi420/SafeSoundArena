import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// טעינת משתני סביבה
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware בסיסי
app.use(cors());
app.use(express.json());

// בדיקת תקינות שרת
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// טיפול בשגיאות גלובלי
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error: ${err.message}`);
  res.status(500).json({
    error: NODE_ENV === 'development' ? err.message : 'Internal Server Error'
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