# Multi-stage build for production
# Builder stage
FROM node:18-alpine AS builder

# הגבלות זמן ריצה
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]

# הגבלות משאבים
RUN apk add --no-cache dumb-init
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# הגדרות אבטחה
ENV NODE_ENV=production
ENV NODE_OPTIONS='--max-old-space-size=512'

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# הרשאות קבצים
RUN chown -R appuser:appgroup /app
RUN find /app -type d -exec chmod 755 {} \; 
RUN find /app -type f -exec chmod 644 {} \;

# Runner stage
FROM node:18-alpine AS runner

# הגבלות זמן ריצה
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]

# הגדרת HEALTHCHECK
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:3000/health || exit 1

WORKDIR /app

# Add non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy built files from builder
COPY --from=builder /app .
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Set security policies
COPY seccomp.json /seccomp.json

# Set non-root user
USER appuser

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
