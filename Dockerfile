# Multi-stage build for production - optimized for layer caching and minimal image size

# Builder stage
FROM node:24-alpine AS builder

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV NODE_OPTIONS='--max-old-space-size=512 --heapsnapshot-signal=SIGUSR2'

WORKDIR /app

# Copy dependency manifests first for better layer caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev --no-audit --no-fund

# Copy application code
COPY . .

# Runner stage - minimal attack surface
FROM node:24-alpine

ARG NODE_ENV=production
ARG SAFESOUND_BUILD_REVISION=unknown
ENV NODE_ENV=${NODE_ENV}
ENV NODE_OPTIONS='--max-old-space-size=512 --heapsnapshot-signal=SIGUSR2'

LABEL org.opencontainers.image.revision="${SAFESOUND_BUILD_REVISION}"

# Fail closed unless the runtime includes the patched OpenSSL floor.
RUN apk add --no-cache \
      'libcrypto3>=3.5.8-r0' \
      'libssl3>=3.5.8-r0' \
      tini curl && \
    apk add --no-cache --virtual .build-deps ca-certificates && \
    rm -rf /var/cache/apk/* /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

WORKDIR /app

# Create non-root user early for security
RUN addgroup -S nodejs && \
    adduser -S nodejs -G nodejs

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app .

# Keep the single-node feature state writable without running the service as root.
RUN mkdir -p /app/data && chown -R nodejs:nodejs /app/data

# Set non-root user for runtime
USER nodejs

# Healthcheck - uses curl instead of Node for lower overhead
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-4000}/api/health || exit 1

# Use tini to handle signals properly
ENTRYPOINT ["/sbin/tini", "--"]

EXPOSE 4000

CMD ["node", "backend/app.js"]
