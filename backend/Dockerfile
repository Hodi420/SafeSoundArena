FROM node:20-alpine

# System deps needed for healthcheck
RUN apk add --no-cache curl

# Create app user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set workdir at repo root then install backend deps
WORKDIR /usr/src/app

# Copy backend package files and install production deps
COPY backend/package*.json backend/
WORKDIR /usr/src/app/backend
RUN npm install --production && npm cache clean --force

# Return to repo root and copy all sources (to include shared aiClients/ etc.)
WORKDIR /usr/src/app
COPY . .

# Install ts-node/typescript globally for running TypeScript in production
RUN npm install -g ts-node typescript

# Cleanup unnecessary dirs to keep image small
RUN rm -rf frontend/ docs/ tests/ test/ *.log *.tmp || true

# Permissions
RUN chown -R appuser:appgroup /usr/src/app
USER appuser

EXPOSE 4000

# Run from backend directory
WORKDIR /usr/src/app/backend

# Start the TypeScript server
CMD ["npm", "run", "start"]
