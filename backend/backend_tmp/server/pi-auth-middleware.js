// Pi Network authentication middleware for Express APIs
const axios = require('axios');

const PI_API_BASE = 'https://api.minepi.com';

// Middleware: verifies Pi Network access token from Authorization header
async function piAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  try {
    // Validate token with Pi API
    const response = await axios.get(`${PI_API_BASE}/user/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    req.piUser = response.data; // Attach Pi user profile to request
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid Pi Network token', details: err.response?.data || err.message });
  }
}

module.exports = piAuth;
