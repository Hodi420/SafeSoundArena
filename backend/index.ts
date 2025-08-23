import 'dotenv/config';
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
const leaderboardRoutes = require('./routes/leaderboard.js');
import aiRouterRoutes from './routes/ai-router';
import path from 'path';
import { listTokens, addToken, removeToken } from './src/services/userTokens';

// Bring in license validator and Pi Network auth middleware (CommonJS modules)
// These implement project guidelines: license validation and Pi auth
// They live outside the TS backend but can be required at runtime
// eslint-disable-next-line @typescript-eslint/no-var-requires
const licenseValidator = require('../utils/license-validator.js');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const piAuth = require('../server/pi-auth-middleware.js');

// Express app setup
const app: Express = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Environment variables
const PORT = process.env.PORT || 3002;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_BUILD_DIR = process.env.FRONTEND_BUILD_DIR;

// Start server
async function startServer() {
  // Request ID middleware (attach correlation id to every request/response)
  app.use((req, res, next) => {
    (req as any).requestId = (req as any).requestId || uuidv4();
    res.setHeader('X-Request-Id', (req as any).requestId);
    next();
  });

  // Basic middleware
  app.use((req, res, next) => {
    // dev key check (enabled only in dev unless FORCE_DEV_GATE=true)
    const isDev = process.env.NODE_ENV !== 'production' || process.env.FORCE_DEV_GATE === 'true';
    if (isDev) {
      const devKey = req.headers['x-dev-key'];
      const expected = process.env.DEV_ACCESS_TOKEN;
      if (expected && devKey !== expected) {
        return res.status(401).json({ error: 'Unauthorized (dev key missing)', requestId: (req as any).requestId });
      }
    }
    next();
  });

  // Security headers
  app.use(helmet());
  // Add strict Content Security Policy per project guidelines
  app.use(helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: [
        "'self'",
        ...(NODE_ENV !== 'production'
          ? [
              'http://localhost:3000',
              `http://localhost:${PORT}`,
              'ws://localhost:3000',
              `ws://localhost:${PORT}`
            ]
          : [])
      ],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: []
    }
  }));

  app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'x-dev-key']
  }));
  app.use(express.json({ limit: '1mb' }));

  // Handle invalid JSON bodies early with a clear 400 response
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && (err as any).status === 400 && 'body' in err) {
      return res.status(400).json({ error: 'Invalid JSON body', message: err.message, requestId: (req as any).requestId });
    }
    next(err);
  });

  // API rate limiting (per IP)
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: 120, // 120 req/min
    standardHeaders: true,
    legacyHeaders: false,
    message: (req: Request) => ({ error: 'Too many requests, please try again later', code: 'RATE_LIMIT_EXCEEDED', requestId: (req as any).requestId })
  });
  app.use('/api', apiLimiter);

  // Digital watermark middleware (based on utils/license-validator)
  // Adds a hidden watermark to HTML/SVG responses; optional for JSON via ENABLE_WATERMARK_JSON=true
  app.use((req: Request, res: Response, next: NextFunction) => {
    const enableWM = (process.env.ENABLE_WATERMARK || 'true') === 'true';
    if (!enableWM) return next();

    const originalSend = (res as any).send.bind(res);
    const originalJson = (res as any).json.bind(res);

    (res as any).send = (body: any) => {
      try {
        if (typeof body === 'string') {
          const meta = { path: req.path, requestId: (req as any).requestId };
          body = licenseValidator.addDigitalWatermark(body, meta);
        }
      } catch (e) {
        // noop on watermark fail
      }
      return originalSend(body);
    };

    (res as any).json = (data: any) => {
      try {
        if ((process.env.ENABLE_WATERMARK_JSON === 'true') && data && typeof data === 'object' && !Array.isArray(data)) {
          const meta = { path: req.path, requestId: (req as any).requestId };
          // Add a lightweight watermark marker without mutating business fields
          const wrapped = JSON.parse(licenseValidator.addDigitalWatermark(JSON.stringify(data), meta));
          return originalJson(wrapped);
        }
      } catch (e) {
        // fall through
      }
      return originalJson(data);
    };

    next();
  });

  // In production, optionally serve the built frontend
  if (process.env.NODE_ENV === 'production' && FRONTEND_BUILD_DIR) {
    app.use(express.static(FRONTEND_BUILD_DIR));
    app.get('*', (req, res) => {
      res.sendFile(path.join(FRONTEND_BUILD_DIR!, 'index.html'));
    });
  }

  // API Routes
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/ai', aiRouterRoutes);

  // Pi auth verify (browser SDK sends signed payload)
  app.post('/api/auth/pi/verify', async (req: Request, res: Response) => {
    try {
      const { userAuthResult } = req.body || {};
      if (!userAuthResult) return res.status(400).json({ error: 'Missing userAuthResult', requestId: (req as any).requestId });
      // TODO: verify against Pi servers using process.env.PI_API_KEY
      // Assuming valid and extract piUserId
      const piUserId = userAuthResult?.user?.uid || 'pi-demo-user';
      // Issue session (demo: return ok)
      return res.status(200).json({ ok: true, userId: piUserId, requestId: (req as any).requestId });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Pi verify failed', requestId: (req as any).requestId });
    }
  });

  // Profile update (fill missing details)
  app.patch('/api/user/profile', (req: Request, res: Response) => {
    const { email, displayName } = req.body || {};
    // TODO: persist in DB; demo returns accepted
    return res.status(200).json({ ok: true, email, displayName, requestId: (req as any).requestId });
  });

  // Personal tokens management (masked, encrypted storage server-side)
  app.get('/api/user/tokens', (req: Request, res: Response) => {
    const userId = (req.query.userId as string) || 'pi-demo-user';
    return res.status(200).json({ tokens: listTokens(userId), requestId: (req as any).requestId });
  });
  app.post('/api/user/tokens', (req: Request, res: Response) => {
    const userId = (req.body?.userId as string) || 'pi-demo-user';
    const provider = req.body?.provider as string;
    const token = req.body?.token as string;
    const alias = (req.body?.alias as string) || undefined;
    const allow = new Set(['openai','anthropic','gemini','huggingface','xai','custom']);
    if (!provider || !token) return res.status(400).json({ error: 'Missing provider/token', requestId: (req as any).requestId });
    if (!allow.has(provider)) return res.status(400).json({ error: 'Unsupported provider', requestId: (req as any).requestId });
    const saved = addToken(userId, provider, token, alias);
    return res.status(201).json({ token: saved, requestId: (req as any).requestId });
  });
  app.delete('/api/user/tokens/:id', (req: Request, res: Response) => {
    const userId = (req.query.userId as string) || 'pi-demo-user';
    const ok = removeToken(userId, req.params.id);
    return res.status(ok ? 200 : 404).json({ ok, requestId: (req as any).requestId });
  });

  // License verification API (per project guidelines)
  app.post('/api/license/verify', async (req: Request, res: Response) => {
    try {
      const { licenseKey } = req.body || {};
      const license = await licenseValidator.verifyLicense(licenseKey);
      const integrity = licenseValidator.verifyCodeIntegrity();
      return res.status(200).json({
        requestId: (req as any).requestId,
        license,
        integrity
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'License verification failed', requestId: (req as any).requestId });
    }
  });

  // Pi Network protected endpoint example
  app.get('/api/secure/pi/profile', piAuth, (req: any, res: Response) => {
    return res.status(200).json({
      requestId: req.requestId,
      profile: req.piUser || null
    });
  });

  // Watermark preview utility (dev/testing)
  app.post('/api/watermark/preview', (req: Request, res: Response) => {
    const { content, metadata } = req.body || {};
    const watermarked = typeof content === 'string' ? licenseValidator.addDigitalWatermark(content, metadata) : content;
    const extracted = typeof watermarked === 'string' ? licenseValidator.extractDigitalWatermark(watermarked) : null;
    return res.status(200).json({ requestId: (req as any).requestId, watermarked, extracted });
  });

  // Security guidelines index (discoverability for developers)
  app.get('/api/security/guidelines', (req: Request, res: Response) => {
    return res.status(200).json({
      requestId: (req as any).requestId,
      files: [
        {
          path: '/docs/SECURITY_GUIDELINES.md',
          topics: [
            'אבטחת קוד',
            'ניהול סודות ומפתחות',
            'אימות והרשאות',
            'אבטחת API',
            'אבטחת מסד נתונים',
            'הגנה מפני התקפות נפוצות (XSS, CSRF, Injection)',
            'אבטחת Docker',
            'הגנה על קניין רוחני (סימני מים דיגיטליים, אימות רישיון)',
            'תהליך סקירת קוד',
            'דיווח על פרצות אבטחה'
          ]
        },
        {
          path: '/pioneer-pathways/SECURITY.md',
          topics: ['Security Policy', 'Supported Versions', 'Reporting a Vulnerability']
        },
        {
          path: '/license-server/SECURITY.md',
          topics: ['נהלי אבטחה מומלצים', 'ניהול מפתחות וסודות', 'תיעוד ובקרה']
        },
        {
          path: '/docs/api/authentication-api.yaml',
          topics: ['Pi Network authentication API specification']
        }
      ]
    });
  });

  // Project guidelines and documentation index
  app.get('/api/guidelines', (req: Request, res: Response) => {
    return res.status(200).json({
      requestId: (req as any).requestId,
      project: 'SafeSoundArena',
      documentation_structure: {
        main_docs: [
          {
            path: '/README.md',
            title: 'Project Overview & Setup',
            description: 'Main project documentation and setup instructions',
            language: 'hebrew/english'
          },
          {
            path: '/CONTRIBUTING.md',
            title: 'Contribution Guidelines',
            description: 'Development guidelines and coding standards',
            language: 'hebrew/english'
          },
          {
            path: '/SECURITY.md',
            title: 'General Security Policy',
            description: 'Project-wide security policy and vulnerability reporting',
            language: 'english'
          }
        ],
        detailed_security: [
          {
            path: '/docs/SECURITY_GUIDELINES.md',
            title: 'Comprehensive Security Guidelines',
            description: 'Detailed security practices for developers',
            language: 'hebrew/english',
            sections: [
              'Code Security & Scanning',
              'Secrets Management',
              'Authentication & Authorization',
              'API Security',
              'Database Security',
              'Common Attack Protection',
              'Docker Security',
              'IP Protection & Digital Watermarks',
              'Code Review Process',
              'Vulnerability Reporting'
            ]
          }
        ],
        api_specifications: [
          {
            path: '/docs/api/authentication-api.yaml',
            title: 'Authentication API Specification',
            description: 'OpenAPI spec for JWT and Pi Network authentication',
            format: 'OpenAPI 3.0'
          },
          {
            path: '/license-server/openapi.yaml',
            title: 'License Server API',
            description: 'Complete license management and verification API',
            format: 'OpenAPI 3.0',
            language: 'hebrew/english'
          }
        ],
        module_specific: [
          {
            path: '/pioneer-pathways/SECURITY.md',
            title: 'Pioneer Pathways Security',
            description: 'Security policy for the pioneer pathways module'
          },
          {
            path: '/pioneer-pathways/CONTRIBUTING.md',
            title: 'Pioneer Pathways Development',
            description: 'Development guidelines for pioneer pathways'
          },
          {
            path: '/pioneer-pathways/README.md',
            title: 'Pioneer Pathways Documentation',
            description: 'Module overview and usage instructions'
          },
          {
            path: '/pioneer-pathways/DOCS/GUIDE.md',
            title: 'Pioneer Pathways User Guide',
            description: 'End-user guide for the pioneer pathways system'
          },
          {
            path: '/pioneer-pathways/gui/LUDUS_AI_INSTRUCTIONS.md',
            title: 'Ludus AI Instructions',
            description: 'AI system instructions for the GUI component'
          },
          {
            path: '/pioneer-pathways/gui/PRIVACY_POLICY.md',
            title: 'GUI Privacy Policy',
            description: 'Privacy policy for the GUI application'
          },
          {
            path: '/license-server/README.md',
            title: 'License Server Documentation',
            description: 'Setup and usage instructions for license server'
          }
        ],
        runbooks: [
          {
            path: '/docs/runbooks/authentication-incidents.md',
            title: 'Authentication Incident Response',
            description: 'Procedures for handling authentication-related incidents'
          }
        ],
        examples: [
          {
            path: '/examples/usageExamples.md',
            title: 'Usage Examples',
            description: 'Code examples and integration patterns'
          }
        ],
        deployment: [
          {
            path: '/docker-compose.secure.yml',
            title: 'Secure Deployment Configuration',
            description: 'Production-ready Docker configuration with security hardening'
          },
          {
            path: '/deploy-prod.md',
            title: 'Production Deployment Guide',
            description: 'Step-by-step production deployment instructions'
          }
        ]
      },
      access_endpoints: {
        security_guidelines: '/api/security/guidelines',
        api_documentation: '/api/docs',
        system_capabilities: '/api/capabilities',
        project_meta: '/api/meta'
      }
    });
  });

  // API Docs endpoint (high-level)
  app.get('/api/docs', (req: Request, res: Response) => {
    return res.status(200).json({
      name: 'SafeSoundArena API',
      version: process.env.APP_VERSION || 'dev',
      requestId: (req as any).requestId,
      endpoints: [
        { method: 'GET', path: '/api/health', description: 'Server health check' },
        { method: 'GET', path: '/healthz', description: 'Kubernetes-style liveness probe' },
        { method: 'GET', path: '/api/docs', description: 'This documentation index' },
        { method: 'GET', path: '/api/capabilities', description: 'List of available modules/capabilities' },
        { method: 'GET', path: '/api/security/guidelines', description: 'Project security and development guidelines index' },
        { method: 'GET', path: '/api/guidelines', description: 'Unified project documentation index' },
        { method: 'POST', path: '/api/license/verify', description: 'Verify license key and code integrity' },
        { method: 'GET', path: '/api/secure/pi/profile', description: 'Protected by Pi Network auth; returns Pi user profile' },
        { method: 'POST', path: '/api/watermark/preview', description: 'Preview digital watermark add/extract' },
        { method: 'GET', path: '/api/ai/models', description: 'Available AI models' },
        { method: 'GET', path: '/api/ai/stats', description: 'AI router usage statistics' },
        { method: 'POST', path: '/api/ai/chat', description: 'Single AI response' },
        { method: 'POST', path: '/api/ai/chat/candidates', description: 'Parallel candidates with interactionId' },
        { method: 'POST', path: '/api/ai/chat/feedback', description: 'Submit feedback for interaction' },
        { method: 'GET', path: '/api/ai/learning/stats', description: 'Learning statistics' },
        { method: 'POST', path: '/api/ai/learning/recommendations', description: 'Personalized improvement suggestions' },
        { method: 'GET', path: '/api/ai/learning/interactions', description: 'List recent interactions (optional by userId)' },
        { method: 'GET', path: '/api/ai/learning/profile/:userId', description: 'Get user personalization profile' },
        { method: 'GET', path: '/api/ai/learning/patterns', description: 'List learned patterns' },
        { method: 'GET', path: '/api/leaderboard', description: 'Leaderboard API (various routes)' }
      ]
    });
  });

  // Capabilities endpoint (high-level)
  app.get('/api/capabilities', (req: Request, res: Response) => {
    return res.status(200).json({
      requestId: (req as any).requestId,
      modules: {
        ai_router: {
          docs: '/api/ai/docs',
          capabilities: ['/chat', '/chat/candidates', '/chat/feedback', '/analyze', '/models', '/stats', '/learning/stats', '/learning/recommendations', '/learning/interactions', '/learning/profile/:userId', '/learning/patterns']
        },
        security: {
          headers: ['helmet', 'cors', 'X-Request-Id', 'CSP'],
          rate_limit: { windowSec: 60, limitPerWindow: 120 },
          guidelines_endpoint: '/api/security/guidelines',
          guidelines_overview: '/api/guidelines'
        },
        license: {
          docs: '/api/docs#license',
          capabilities: ['/api/license/verify']
        },
        ip_protection: {
          docs: '/docs/SECURITY_GUIDELINES.md#digital-watermarks',
          capabilities: ['digital_watermarks (HTML/SVG)', 'optional_json_watermark']
        },
        pi_network: {
          docs: '/docs/api/authentication-api.yaml',
          capabilities: ['/api/secure/pi/profile']
        },
        leaderboard: {
          docs: '/api/leaderboard/docs',
          capabilities: ['scores', 'users', 'categories']
        },
        socketio: { status: 'running' }
      }
    });
  });

  // Meta endpoint (high-level)
  app.get('/api/meta', (req: Request, res: Response) => {
    return res.status(200).json({
      name: 'SafeSoundArena Backend',
      environment: NODE_ENV,
      version: process.env.APP_VERSION || 'dev',
      time: new Date().toISOString(),
      requestId: (req as any).requestId
    });
  });

  // Health check endpoints
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      environment: NODE_ENV,
      timestamp: new Date().toISOString(),
      services: {
        socketio: 'running',
        ai_router: 'running'
      },
      requestId: (req as any).requestId
    });
  });
  app.get('/healthz', (req, res) => {
    res.status(200).json({ status: 'ok', requestId: (req as any).requestId });
  });

  // Global error handling
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(`[${new Date().toISOString()}] Error: ${err.message}`);
    res.status(500).json({
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
      requestId: (req as any).requestId
    });
  });

  // Socket.io connection handling
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running in ${NODE_ENV} mode on port ${PORT}`);
    console.log(`🤖 AI Router API: http://localhost:${PORT}/api/ai`);
    console.log(`🏆 Leaderboard API: http://localhost:${PORT}/api/leaderboard`);
    console.log(`🧠 Self-Development Engine: http://localhost:${PORT}/api/ai/chat/candidates`);
    console.log(`🔐 License API: http://localhost:${PORT}/api/license/verify`);
    console.log(`🛡️  Pi Protected API: http://localhost:${PORT}/api/secure/pi/profile`);
  });
}

startServer().catch(error => {
  console.error('Error starting server:', error);
});