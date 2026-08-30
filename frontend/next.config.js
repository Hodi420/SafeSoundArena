const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
const socketConnectSources = (() => {
  try {
    const parsed = new URL(socketUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) return ["'self'"];
    const websocketProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    return ["'self'", parsed.origin, `${websocketProtocol}//${parsed.host}`];
  } catch {
    return ["'self'"];
  }
})();
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: __dirname,
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: `default-src 'self'; connect-src ${socketConnectSources.join(' ')}; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; object-src 'none';` },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);
