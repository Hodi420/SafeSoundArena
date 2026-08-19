# Dockerfile for SafeSoundArena Frontend (Next.js)

# Build stage
FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk update && apk upgrade

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --no-audit --no-fund

COPY . .
RUN npm run build

# Production stage
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install wget for healthcheck
RUN apk add --no-cache wget

# Security hardening
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder --chown=appuser:appgroup /app .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O- http://localhost:3000 || exit 1

# Switch to non-root user
USER appuser

# Start the application
CMD ["npm", "start"]
