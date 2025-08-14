# Multi-stage build for production
# Builder stage
FROM node:18-alpine AS runner

# הגבלות זמן ריצה
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]

# הרצה עם הרשאות מוגבלות
USER nodejs

# הגבלות משאבים
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT}', (res) => { \
    if (res.statusCode === 200) process.exit(0); \
    else process.exit(1); \
  }).on('error', () => process.exit(1))"

# אבטחת תהליכים
RUN sysctl -w kernel.yama.ptrace_scope=1
RUN sysctl -w kernel.kptr_restrict=2

# הגבלות משאבים
RUN apk add --no-cache dumb-init
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs
USER nodejs

# הגדרות אבטחה
ENV NODE_ENV=production
ENV NODE_OPTIONS='--max-old-space-size=512 --heapsnapshot-signal=SIGUSR2'

# הרשאות קבצים
RUN chown -R nodejs:nodejs /app
RUN find /app -type d -exec chmod 755 {} \; 
RUN find /app -type f -exec chmod 644 {} \;
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Runner stage
FROM node:18-alpine AS runner

# הגבלות זמן ריצה
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]

# הרצה עם הרשאות מוגבלות
USER nodejs

# הגבלות משאבים
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT}', (res) => { \
    if (res.statusCode === 200) process.exit(0); \
    else process.exit(1); \
  }).on('error', () => process.exit(1))"

# אבטחת תהליכים
RUN sysctl -w kernel.yama.ptrace_scope=1
RUN sysctl -w kernel.kptr_restrict=2
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

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
