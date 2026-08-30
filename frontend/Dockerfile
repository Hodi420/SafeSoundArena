# Dockerfile for SafeSoundArena Frontend (Next.js)

# Build stage
FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
ENV NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL}

RUN apk update && apk upgrade

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --no-audit --no-fund

COPY . .
RUN npm run build

# Production stage
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG SAFESOUND_BUILD_REVISION=unknown
ARG NEXT_PUBLIC_SOCKET_URL=http://localhost:4000

LABEL org.opencontainers.image.revision="${SAFESOUND_BUILD_REVISION}" \
      io.safesoundarena.next-public-socket-url="${NEXT_PUBLIC_SOCKET_URL}"

# Fail closed unless the runtime includes the patched OpenSSL floor.
RUN apk add --no-cache \
      'libcrypto3>=3.5.8-r0' \
      'libssl3>=3.5.8-r0' \
      wget

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
