# Dockerfile for the backend API server
FROM node:18-alpine AS builder
WORKDIR /app/backend
RUN apk add --no-cache tini
COPY backend/package.json ./
RUN npm install --omit=dev --no-audit
COPY backend ./

FROM node:18-alpine AS runner
WORKDIR /app
RUN apk add --no-cache tini
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/backend .
RUN chown -R appuser:appgroup /app
USER appuser
ENTRYPOINT ["/sbin/tini", "--"]
EXPOSE 4000
CMD ["npm", "start"]
