## Build a production Next.js image for safesoundarena-clean

# Build stage
FROM node:18-alpine AS builder
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
# Install all deps with legacy peer resolution to avoid lock conflicts
RUN npm install --legacy-peer-deps --no-audit --no-fund

# Copy source
COPY . .

# Build
RUN npm run build

# Production runtime
FROM node:18-alpine AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy built app and node_modules from builder to avoid peer resolution conflicts
COPY --from=builder --chown=appuser:appgroup /app/.next ./.next
COPY --from=builder --chown=appuser:appgroup /app/public ./public
COPY --from=builder --chown=appuser:appgroup /app/package.json ./package.json
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules

USER appuser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD wget -qO- http://localhost:3000/api/healthz || exit 1

CMD ["npm", "start"]