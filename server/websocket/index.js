const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const GameEventHandler = require('./gameEventHandler');

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ 
      server, 
      path: '/api/ws',
      clientTracking: true,
      maxPayload: 1024 * 1024, // 1MB max payload
      perMessageDeflate: {
        zlibDeflateOptions: {
          chunkSize: 1024,
          memLevel: 7,
          level: 3
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024
        },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 10,
        concurrencyLimit: 10,
        threshold: 1024
      }
    });
    
    this.clients = new Map(); // Map<clientId, {ws: WebSocket, userId: string, gameId: string|null}>
    this.games = new Map(); // Map<gameId, Set<clientId>>
    this.gameEventHandler = new GameEventHandler(this);
    
    this.setupEventHandlers();
    this.initializeHeartbeat();
  }

  initializeHeartbeat() {
    // Send ping every 30 seconds
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping(() => {});
      });
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  setupEventHandlers() {
    // Initialize game event handler
    this.gameEventHandler.initialize();

    this.wss.on('connection', (ws, req) => {
      // Set up ping-pong for connection health
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Extract token from query parameters or headers
      const token = this.extractToken(req);
      
      if (!token) {
        ws.close(1008, 'Authentication required');
        return;
      }

      try {
        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { userId } = decoded;
        const clientId = this.generateClientId();

        // Store client connection
        this.clients.set(clientId, { ws, userId, gameId: null });
        
        logger.info(`Client connected: ${clientId} (User: ${userId})`);

        // Send connection confirmation
        this.send(ws, 'connection:established', { clientId });

        // Handle messages from client
        ws.on('message', (message) => this.handleMessage(clientId, message));
        
        // Handle client disconnection
        ws.on('close', () => this.handleDisconnect(clientId));
        
      } catch (error) {
        logger.error('WebSocket authentication failed:', error);
        ws.close(1008, 'Invalid token');
      }
    });
  }

  extractToken(req) {
    // Try to get token from query params first
    if (req.url) {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      if (token) return token;
    }
    
    // Then try to get from headers
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }
    
    return null;
  }

  generateClientId() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  handleMessage(clientId, message) {
    try {
      const { event, data } = JSON.parse(message);
      const client = this.clients.get(clientId);
      
      if (!client) return;

      logger.debug(`Received ${event} from ${clientId} (User: ${client.userId})`, data);

      // Handle different types of events
      switch (event) {
        case 'game:join':
          this.handleGameJoin(clientId, data.gameId);
          break;
          
        case 'game:leave':
          this.handleGameLeave(clientId);
          break;
          
        case 'game:action':
          this.handleGameAction(clientId, data);
          break;
          
        case 'game:chat':
          this.handleGameChat(clientId, data.message);
          break;
          
        default:
          logger.warn(`Unknown event type: ${event}`);
      }
      
    } catch (error) {
      logger.error('Error handling WebSocket message:', error);
    }
  }

  handleGameJoin(clientId, gameId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Leave current game if any
    if (client.gameId) {
      this.handleGameLeave(clientId);
    }

    // Add client to game
    client.gameId = gameId;
    
    if (!this.games.has(gameId)) {
      this.games.set(gameId, new Set());
    }
    
    this.games.get(gameId).add(clientId);
    
    // Notify all players in the game about the new player
    this.broadcastToGame(gameId, 'game:player-joined', {
      playerId: client.userId,
      gameId,
      timestamp: Date.now()
    });
    
    logger.info(`Client ${clientId} joined game ${gameId}`);
  }

  handleGameLeave(clientId) {
    const client = this.clients.get(clientId);
    if (!client || !client.gameId) return;

    const { gameId, userId } = client;
    
    // Remove client from game
    if (this.games.has(gameId)) {
      const gameClients = this.games.get(gameId);
      gameClients.delete(clientId);
      
      // Remove game if empty
      if (gameClients.size === 0) {
        this.games.delete(gameId);
      } else {
        // Notify other players about the player leaving
        this.broadcastToGame(gameId, 'game:player-left', {
          playerId: userId,
          gameId,
          timestamp: Date.now()
        });
      }
    }
    
    client.gameId = null;
    logger.info(`Client ${clientId} left game ${gameId}`);
  }

  handleGameAction(clientId, action) {
    const client = this.clients.get(clientId);
    if (!client || !client.gameId) return;

    // Broadcast the action to all players in the game
    this.broadcastToGame(client.gameId, 'game:action', {
      playerId: client.userId,
      action,
      timestamp: Date.now()
    });
  }

  handleGameChat(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || !client.gameId) return;

    // Broadcast the chat message to all players in the game
    this.broadcastToGame(client.gameId, 'game:chat', {
      playerId: client.userId,
      message,
      timestamp: Date.now()
    });
  }

  handleDisconnect(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    logger.info(`Client disconnected: ${clientId} (User: ${client.userId})`);
    
    // Handle leaving games on disconnect
    if (client.gameId) {
      this.handleGameLeave(clientId);
    }
    
    // Remove client from active connections
    this.clients.delete(clientId);
  }

  // Send a message to a specific client
  send(ws, event, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event, data }));
    }
  }

  // Broadcast a message to all clients in a game
  broadcastToGame(gameId, event, data) {
    if (!this.games.has(gameId)) return;
    
    const gameClients = this.games.get(gameId);
    const message = JSON.stringify({ event, data });
    
    gameClients.forEach(clientId => {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }

  // Broadcast a message to all connected clients
  broadcast(event, data) {
    const message = JSON.stringify({ event, data });
    
    this.clients.forEach(({ ws }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
}

module.exports = WebSocketServer;
