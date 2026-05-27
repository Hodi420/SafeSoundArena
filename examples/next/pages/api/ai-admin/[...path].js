const createAiAdminGovernanceRouter = require('../../../../../src/server/aiAdminGovernance');

const router = createAiAdminGovernanceRouter();

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req, res) {
  const pathParts = Array.isArray(req.query.path)
    ? req.query.path
    : [req.query.path].filter(Boolean);
  const originalUrl = req.url;
  const url = new URL(req.url || '/', 'http://localhost');

  req.get = (name) => req.headers[String(name).toLowerCase()];
  req.url = `/${pathParts.join('/')}${url.search}`;

  return router(req, res, (error) => {
    req.url = originalUrl;
    if (error) {
      res.status(500).json({
        requestId: req.headers['x-request-id'] || null,
        error: {
          code: 'AI_ADMIN_NEXT_ADAPTER_ERROR',
          message: error.message,
        },
        data: null,
      });
      return;
    }

    res.status(404).json({
      requestId: req.headers['x-request-id'] || null,
      error: {
        code: 'AI_ADMIN_ROUTE_NOT_FOUND',
        message: 'AI Admin route was not found.',
      },
      data: null,
    });
  });
}
