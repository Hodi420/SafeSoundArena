'use client';

import { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { webSocketService } from '@/lib/websocket';
import { useAuth } from '@/hooks/useAuth';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const eventHandlers = useRef(new Map());

  // Initialize WebSocket connection when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.token) {
      webSocketService.connect(user.token);
      
      return () => {
        webSocketService.disconnect();
      };
    }
  }, [isAuthenticated, user?.token]);

  // Clean up event handlers on unmount
  useEffect(() => {
    return () => {
      // Remove all event handlers when component unmounts
      eventHandlers.current.forEach((handler, event) => {
        webSocketService.off(event, handler);
      });
      eventHandlers.current.clear();
    };
  }, []);

  // Subscribe to WebSocket events
  const subscribe = useCallback((event, callback) => {
    // Remove previous handler if it exists
    if (eventHandlers.current.has(event)) {
      webSocketService.off(event, eventHandlers.current.get(event));
    }
    
    // Store the handler
    eventHandlers.current.set(event, callback);
    
    // Subscribe to the event
    return webSocketService.on(event, callback);
  }, []);

  // Send message through WebSocket
  const send = useCallback((event, data) => {
    webSocketService.emit(event, data);
  }, []);

  // Join a game room
  const joinGame = useCallback((gameId) => {
    send('game:join', { gameId });
  }, [send]);

  // Leave current game room
  const leaveGame = useCallback(() => {
    send('game:leave', {});
  }, [send]);

  // Send game action
  const sendGameAction = useCallback((action) => {
    send('game:action', action);
  }, [send]);

  // Send chat message
  const sendChatMessage = useCallback((message) => {
    send('game:chat', { message });
  }, [send]);

  const value = {
    isConnected: webSocketService.socket?.readyState === WebSocket.OPEN,
    connectionId: webSocketService.getConnectionId(),
    subscribe,
    send,
    joinGame,
    leaveGame,
    sendGameAction,
    sendChatMessage,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
