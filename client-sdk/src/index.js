/**
 * SafeSoundArena Client SDK
 * A lightweight JavaScript library for interacting with the SafeSoundArena game server
 */

class SafeSoundArenaClient {
  /**
   * Initialize a new game client
   * @param {Object} options - Configuration options
   * @param {string} options.serverUrl - WebSocket server URL (e.g., 'wss://api.safesoundarena.com')
   * @param {string} options.authToken - JWT authentication token
   * @param {Object} options.callbacks - Event callbacks
   */
  constructor({ serverUrl, authToken, callbacks = {} }) {
    this.serverUrl = serverUrl;
    this.authToken = authToken;
    this.callbacks = {
      onConnected: () => {},
      onDisconnected: () => {},
      onError: () => {},
      onGameState: () => {},
      onChatMessage: () => {},
      onPlayerJoined: () => {},
      onPlayerLeft: () => {},
      ...callbacks
    };
    
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.heartbeatInterval = null;
    this.pendingRequests = new Map();
    this.requestId = 0;
  }

  /**
   * Connect to the game server
   */
  connect() {
    if (this.socket) {
      console.warn('Already connected to server');
      return;
    }

    try {
      const wsUrl = new URL('/ws', this.serverUrl);
      wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl.searchParams.set('token', this.authToken);

      this.socket = new WebSocket(wsUrl.toString());
      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to connect:', error);
      this.handleError('CONNECTION_ERROR', 'Failed to establish connection');
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  setupEventHandlers() {
    if (!this.socket) return;

    this.socket.onopen = () => {
      console.log('Connected to game server');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.callbacks.onConnected();
    };

    this.socket.onclose = (event) => {
      console.log('Disconnected from server:', event.code, event.reason);
      this.cleanup();
      this.callbacks.onDisconnected(event);
      this.attemptReconnect();
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.handleError('WEBSOCKET_ERROR', 'WebSocket connection error');
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing message:', error);
        this.handleError('MESSAGE_ERROR', 'Failed to parse message');
      }
    };
  }

  /**
   * Handle incoming WebSocket messages
   * @param {Object} message - The parsed message object
   */
  handleMessage(message) {
    const { type, payload, requestId } = message;

    // Handle request/response pattern
    if (requestId && this.pendingRequests.has(requestId)) {
      const { resolve, reject } = this.pendingRequests.get(requestId);
      this.pendingRequests.delete(requestId);
      
      if (type.endsWith(':error')) {
        reject(payload);
      } else {
        resolve(payload);
      }
      return;
    }

    // Handle server events
    switch (type) {
      case 'game:state-update':
        this.callbacks.onGameState(payload);
        break;
      case 'chat:message-received':
        this.callbacks.onChatMessage(payload);
        break;
      case 'game:player-joined':
        this.callbacks.onPlayerJoined(payload);
        break;
      case 'game:player-left':
        this.callbacks.onPlayerLeft(payload);
        break;
      case 'connection:heartbeat':
        // Update last heartbeat time
        this.lastHeartbeat = Date.now();
        break;
      default:
        console.warn('Unhandled message type:', type, payload);
    }
  }

  /**
   * Send a message to the server
   * @param {string} type - Message type
   * @param {Object} payload - Message payload
   * @param {boolean} expectResponse - Whether to expect a response
   * @returns {Promise} Resolves with response if expectResponse is true
   */
  send(type, payload = {}, expectResponse = false) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('Not connected to server'));
    }

    const message = { type, payload };
    
    if (expectResponse) {
      return new Promise((resolve, reject) => {
        const requestId = this.getNextRequestId();
        this.pendingRequests.set(requestId, { resolve, reject });
        
        // Set timeout for response
        setTimeout(() => {
          if (this.pendingRequests.has(requestId)) {
            this.pendingRequests.delete(requestId);
            reject(new Error('Request timeout'));
          }
        }, 10000); // 10 second timeout

        this.socket.send(JSON.stringify({ ...message, requestId }));
      });
    }

    this.socket.send(JSON.stringify(message));
    return Promise.resolve();
  }

  /**
   * Start the heartbeat mechanism
   */
  startHeartbeat() {
    this.lastHeartbeat = Date.now();
    
    // Clear existing interval if any
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.send('connection:heartbeat', { timestamp: Date.now() });
        
        // Check if we missed too many heartbeats
        if (Date.now() - this.lastHeartbeat > 90000) { // 90 seconds
          console.warn('Missed heartbeats, reconnecting...');
          this.reconnect();
        }
      }
    }, 30000);
  }

  /**
   * Attempt to reconnect to the server
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.handleError('MAX_RECONNECT_ATTEMPTS', 'Failed to reconnect after multiple attempts');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
        return; // Already reconnecting
      }
      this.connect();
    }, delay);
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.onmessage = null;
      
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.close();
      }
      
      this.socket = null;
    }
    
    // Reject all pending requests
    for (const [requestId, { reject }] of this.pendingRequests) {
      reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();
  }

  /**
   * Disconnect from the server
   */
  disconnect() {
    if (this.socket) {
      this.socket.close(1000, 'Client disconnected');
    }
    this.cleanup();
  }

  /**
   * Handle errors
   * @param {string} code - Error code
   * @param {string} message - Error message
   */
  handleError(code, message) {
    const error = new Error(message);
    error.code = code;
    this.callbacks.onError(error);
  }

  /**
   * Get the next request ID
   * @returns {string} Unique request ID
   */
  getNextRequestId() {
    return `req_${++this.requestId}_${Date.now()}`;
  }

  // --- High-level API Methods ---

  /**
   * Create a new game
   * @param {Object} options - Game options
   * @returns {Promise<Object>} Game details
   */
  createGame(options = {}) {
    return this.send('game:create', options, true);
  }

  /**
   * Join an existing game
   * @param {string} gameId - ID of the game to join
   * @returns {Promise<Object>} Game state
   */
  joinGame(gameId) {
    return this.send('game:join', { gameId }, true);
  }

  /**
   * Make a move in the current game
   * @param {string} gameId - ID of the game
   * @param {Object} move - Move details
   * @returns {Promise<Object>} Updated game state
   */
  makeMove(gameId, move) {
    return this.send('game:move', { gameId, move }, true);
  }

  /**
   * Send a chat message
   * @param {string} gameId - ID of the game
   * @param {string} message - Message text
   * @param {string} type - Message type ('text' or 'system')
   * @returns {Promise<void>}
   */
  sendChatMessage(gameId, message, type = 'text') {
    return this.send('chat:message', { gameId, message, type });
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  // CommonJS
  module.exports = SafeSoundArenaClient;
} else if (typeof define === 'function' && define.amd) {
  // AMD
  define([], () => SafeSoundArenaClient);
} else {
  // Browser global
  window.SafeSoundArenaClient = SafeSoundArenaClient;
}
