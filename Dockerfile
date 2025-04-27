# Dockerfile for SafeSoundArena Node.js API Server
FROM node:18-alpine

WORKDIR /app

# Install only dependencies
COPY package*.json ./
RUN npm install --production

# Copy all source code
COPY . .

# Expose server port
EXPOSE 4000

# Start the server
CMD ["npm", "start"]
