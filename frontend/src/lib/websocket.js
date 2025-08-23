import { v4 as uuidv4 } from 'uuid';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.callbacks = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 1000; // Start with 1 second
    this.maxReconnectInterval = 30000; // Max 30 seconds
    this.connectionId = uuidv4();
  }

  connect(token) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const wsUrl = `${wsProtocol}${window.location.host}/api/ws`;
    
    this.socket = new WebSocket(wsUrl, [
      'access-token',
      token,
      'client-id',
      this.connectionId,
    ]);

    this.socket.onopen = () => {
      console.log('WebSocket Connected');
      this.reconnectAttempts = 0;
      this.reconnectInterval = 1000;
      this.emit('connection:established', { connectionId: this.connectionId });
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.socket.onclose = (event) => {
      console.log('WebSocket Disconnected:', event);
      this.handleReconnect();
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const timeout = Math.min(
        this.reconnectInterval * Math.pow(2, this.reconnectAttempts),
        this.maxReconnectInterval
      );

      console.log(`Reconnecting in ${timeout}ms...`);
      
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, timeout);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('connection:failed');
    }
  }

  handleMessage(message) {
    const { event, data } = message;
    
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket callback for event '${event}':`, error);
        }
      });
    }
  }

  on(event, callback) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.off(event, callback);
    };
  }

  off(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
      
      if (this.callbacks[event].length === 0) {
        delete this.callbacks[event];
      }
    }
  }

  emit(event, data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ event, data }));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', { event, data });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.callbacks = {};
    }
  }

  getConnectionId() {
    return this.connectionId;
  }
}

// Create a singleton instance
export const webSocketService = new WebSocketService();

// WebSocket hook for React components
export function useWebSocket(event, callback) {
  const callbackRef = useRef(callback);
  
  // Update callback ref if callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const handleMessage = (data) => {
      if (typeof callbackRef.current === 'function') {
        callbackRef.current(data);
      }
    };

    // Subscribe to the event
    const unsubscribe = webSocketService.on(event, handleMessage);

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [event]);

  return webSocketService;
}
