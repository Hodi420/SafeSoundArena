require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const logger = require('./utils/logger');
const { serverAdapter } = require('./queue/queue');

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX || 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Queue dashboard
app.use('/admin/queues', serverAdapter.getRouter());

// Basic route for health checks
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// API Routes
const videoRoutes = require('./routes/video.routes');
app.use('/api/videos', videoRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/agents', require('./routes/agentRoutes'));
app.use('/api/blockchain', require('./routes/blockchainRoutes'));

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, error: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  logger.error(err.stack);

  // Handle JWT authentication errors
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  // Handle rate limiting
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later.',
    });
  }

  // Default error response
  const errorResponse = {
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
  };

  // Include error code if available
  if (err.code) {
    errorResponse.code = err.code;
  }

  res.status(err.status || 500).json(errorResponse);
});

module.exports = app;
