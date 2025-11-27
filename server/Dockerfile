FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV PORT=3005 \
    MCP_ENABLE_SHELL=false \
    MCP_ENABLE_GIT=false \
    MCP_ENABLE_HTTP=false

EXPOSE 3005
CMD ["node", "mcp.js"]


