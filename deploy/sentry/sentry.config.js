// @ts-check
'use strict';

const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your existing Next.js config
  reactStrictMode: true,
  
  // Enable source maps in production
  productionBrowserSourceMaps: true,
  
  // Configure images if needed
  images: {
    domains: ['your-cdn-domain.com'],
  },
  
  // Environment variables that should be available on the client side
  env: {
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_ENV: process.env.NODE_ENV,
  },
  
  // Webpack configuration for source maps
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // Enable source maps in development for the client
      config.devtool = 'source-map';
    }
    
    // Add custom webpack configurations if needed
    config.plugins.push(
      new webpack.DefinePlugin({
        // Add global constants here
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      })
    );
    
    return config;
  },
};

// Sentry configuration
const sentryWebpackPluginOptions = {
  // Additional config options for the Sentry Webpack plugin
  silent: true, // Suppresses all logs
  org: 'your-org-name',
  project: 'safesoundarena',
  // Upload source maps during build
  include: '.next',
  // URL prefix to add to the beginning of all filenames
  urlPrefix: '~/_next',
  // Set the current environment
  environment: process.env.NODE_ENV,
  // Release version (e.g., from git SHA or package.json version)
  release: process.env.VERCEL_GIT_COMMIT_SHA || `safesoundarena@${require('./package.json').version}`,
  // Automatically capture performance monitoring
  tracesSampleRate: 0.1, // Adjust based on your needs (0.0 to 1.0)
  // Enable capturing of console logs
  attachStacktrace: true,
  // Disable automatic performance monitoring for local development
  autoSessionTracking: process.env.NODE_ENV !== 'development',
  // Filter out specific errors if needed
  beforeSend(event, hint) {
    const error = hint.originalException;
    
    // Ignore specific errors
    if (error && error.message && error.message.match(/network timeout|failed to fetch/i)) {
      return null;
    }
    
    return event;
  },
};

// Export the final configuration with Sentry
module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
