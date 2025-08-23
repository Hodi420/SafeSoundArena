const axios = require('axios');
const { RateLimiterMemory } = 'rate-limiter-flexible';

const PI_API_BASE = 'https://api.minepi.com';

// Rate limiting: 10 requests per minute per IP
const rateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60, // 1 minute
  blockDuration: 300, // Block for 5 minutes after limit exceeded
});

// Cache for Pi Network public keys to reduce API calls
const publicKeyCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Middleware to verify Pi Network access token
 */
async function piAuth(req, res, next) {
  try {
    // Rate limiting check
    await rateLimiter.consume(req.ip);

    const authHeader = req.headers['authorization'];
    
    // Validate Authorization header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Missing or invalid Authorization header',
        code: 'INVALID_AUTH_HEADER'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ 
        error: 'No access token provided',
        code: 'NO_ACCESS_TOKEN'
      });
    }

    // Get Pi Network public key (with caching)
    let publicKey = publicKeyCache.get('pi_public_key');
    if (!publicKey) {
      try {
        const response = await axios.get(`${PI_API_BASE}/public-key`);
        publicKey = response.data.publicKey;
        publicKeyCache.set('pi_public_key', publicKey, CACHE_TTL);
      } catch (error) {
        console.error('Failed to fetch Pi Network public key:', error);
        return res.status(503).json({
          error: 'Service temporarily unavailable',
          code: 'SERVICE_UNAVAILABLE'
        });
      }
    }

    // Verify the access token
    try {
      const response = await axios.get(`${PI_API_BASE}/auth/introspect`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000 // 5 second timeout
      });

      const { data } = response;
      
      // Validate required fields in the response
      if (!data.uid || !data.username) {
        throw new Error('Invalid user data in token');
      }

      // Attach Pi user data to request
      req.piUser = {
        id: data.uid,
        username: data.username,
        roles: data.roles || [],
        kycVerified: data.kyc_verified || false,
        scopes: data.scopes || []
      };

      // Check if user has required scopes (if specified)
      const requiredScopes = req.requiredScopes || [];
      if (requiredScopes.length > 0) {
        const hasRequiredScopes = requiredScopes.every(scope => 
          req.piUser.scopes.includes(scope)
        );
        
        if (!hasRequiredScopes) {
          return res.status(403).json({
            error: 'Insufficient permissions',
            code: 'INSUFFICIENT_SCOPES',
            requiredScopes,
            userScopes: req.piUser.scopes
          });
        }
      }

      next();
    } catch (error) {
      console.error('Pi Network token verification failed:', error);
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const { status, data } = error.response;
        return res.status(status).json({
          error: 'Pi Network authentication failed',
          code: 'PI_AUTH_FAILED',
          details: data
        });
      } else if (error.request) {
        // The request was made but no response was received
        return res.status(504).json({
          error: 'Pi Network service unavailable',
          code: 'PI_SERVICE_UNAVAILABLE'
        });
      } else {
        // Something happened in setting up the request
        return res.status(400).json({
          error: 'Invalid request to Pi Network',
          code: 'INVALID_REQUEST'
        });
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Rate limit exceeded') {
        return res.status(429).json({
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: '5 minutes'
        });
      }
      console.error('Pi Auth Middleware Error:', error);
    }
    
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
}

/**
 * Middleware to require specific scopes
 */
function requireScopes(scopes) {
  return (req, res, next) => {
    req.requiredScopes = Array.isArray(scopes) ? scopes : [scopes];
    return piAuth(req, res, next);
  };
}

module.exports = {
  piAuth,
  requireScopes
};
