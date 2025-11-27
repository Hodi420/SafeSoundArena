# Dockerfile for SafeSoundArena Frontend (Next.js)

# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Check for updates first
RUN apk update && apk upgrade

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Install dependencies with cache
RUN npm install --legacy-peer-deps --prefer-offline --no-audit

# Copy remaining files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Security hardening
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app

# Read-only filesystem except for temp
RUN mkdir -p /tmp && chown appuser:appgroup /tmp

USER appuser
VOLUME /tmp

COPY --from=builder --chown=appuser:appgroup /app .

# Security flags
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1

CMD ["npm", "start"]


# Security flags
EXPOSE 3000

# Copy seccomp profile for basic security
COPY --chown=appuser:appgroup seccomp.json /seccomp.json
RUN chmod 640 /seccomp.json && chown appuser:appgroup /seccomp.json

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1

# Start the application
CMD ["npm", "start"]
