const jwt = require('jsonwebtoken');
const { redisClient } = require('../config/redis');
const crypto = require('crypto');

// Generate secure random string for refresh tokens
const generateToken = () => crypto.randomBytes(40).toString('hex');

// Store refresh token in Redis with user ID as key
const storeRefreshToken = async (userId, token) => {
  try {
    await redisClient.set(`refresh_token:${userId}`, token, {
      EX: 7 * 24 * 60 * 60, // 7 days expiration
      NX: true
    });
    return true;
  } catch (error) {
    console.error('Error storing refresh token:', error);
    return false;
  }
};

// Verify refresh token against stored token
const verifyRefreshToken = async (userId, token) => {
  try {
    const storedToken = await redisClient.get(`refresh_token:${userId}`);
    return storedToken === token;
  } catch (error) {
    console.error('Error verifying refresh token:', error);
    return false;
  }
};

// Invalidate refresh token
const invalidateRefreshToken = async (userId) => {
  try {
    await redisClient.del(`refresh_token:${userId}`);
    return true;
  } catch (error) {
    console.error('Error invalidating refresh token:', error);
    return false;
  }
};

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'No token provided',
      code: 'NO_TOKEN'
    });
  }

  const token = authHeader.split(' ')[1];
  
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(403).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    req.user = decoded;
    next();
  });
};

const handleRefreshToken = async (req, res) => {
  const { refreshToken, userId } = req.body;
  
  if (!refreshToken || !userId) {
    return res.status(400).json({
      error: 'Refresh token and user ID are required',
      code: 'INVALID_REQUEST'
    });
  }

  // Verify refresh token
  const isValid = await verifyRefreshToken(userId, refreshToken);
  if (!isValid) {
    return res.status(403).json({
      error: 'Invalid refresh token',
      code: 'INVALID_REFRESH_TOKEN'
    });
  }

  try {
    // Generate new access token
    const accessToken = jwt.sign(
      { userId: req.user?.id || userId },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Generate new refresh token (optional: rotate refresh token)
    const newRefreshToken = generateToken();
    await storeRefreshToken(userId, newRefreshToken);

    res.json({
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900 // 15 minutes in seconds
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
};

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'שגיאה פנימית בשרת' });
};

const roleGuard = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'אין הרשאה מתאימה' });
    }
    next();
  };
};

module.exports = {
  authenticateJWT,
  handleRefreshToken,
  errorHandler,
  roleGuard
};