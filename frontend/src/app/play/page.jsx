'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function PlayPage() {
  const { isAuthenticated, user } = useAuth();
  const { isConnected, subscribe, joinGame, leaveGame, sendGameAction, sendChatMessage } = useWebSocket();
  const router = useRouter();
  
  const [gameState, setGameState] = useState(null);
  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [gameId, setGameId] = useState('default');
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);
  
  // Handle game state updates
  useEffect(() => {
    const handleGameUpdate = (data) => {
      setGameState(data);
    };
    
    const handlePlayerJoined = (data) => {
      setPlayers(prev => [...prev, data.playerId]);
      addMessage(`Player ${data.playerId} joined the game`);
    };
    
    const handlePlayerLeft = (data) => {
      setPlayers(prev => prev.filter(id => id !== data.playerId));
      addMessage(`Player ${data.playerId} left the game`);
    };
    
    const handleGameChat = (data) => {
      addMessage(`${data.playerId}: ${data.message}`, false);
    };
    
    // Subscribe to WebSocket events
    const unsubscribeGameUpdate = subscribe('game:update', handleGameUpdate);
    const unsubscribePlayerJoined = subscribe('game:player-joined', handlePlayerJoined);
    const unsubscribePlayerLeft = subscribe('game:player-left', handlePlayerLeft);
    const unsubscribeGameChat = subscribe('game:chat', handleGameChat);
    
    return () => {
      unsubscribeGameUpdate?.();
      unsubscribePlayerJoined?.();
      unsubscribePlayerLeft?.();
      unsubscribeGameChat?.();
      leaveGame();
    };
  }, [subscribe, leaveGame]);
  
  // Join the game when component mounts
  useEffect(() => {
    if (isConnected && isAuthenticated) {
      joinGame(gameId);
      addMessage('Connected to game server');
    }
    
    return () => {
      leaveGame();
    };
  }, [isConnected, isAuthenticated, joinGame, leaveGame, gameId]);
  
  const addMessage = (text, isSystem = true) => {
    setMessages(prev => [
      ...prev, 
      { id: Date.now(), text, isSystem, timestamp: new Date() }
    ]);
  };
  
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageInput.trim()) {
      sendChatMessage(messageInput);
      setMessageInput('');
    }
  };
  
  const handleAction = (action) => {
    sendGameAction({ type: action });
  };
  
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Redirecting to login...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4">SafeSoundArena</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Game Area */}
          <div className="md:col-span-2 bg-gray-100 rounded-lg p-4">
            <div className="h-64 bg-gray-200 rounded flex items-center justify-center mb-4">
              {gameState ? (
                <div className="text-center">
                  <p className="text-xl font-semibold">Game in Progress</p>
                  <p>Players: {players.length}</p>
                </div>
              ) : (
                <p>Waiting for game to start...</p>
              )}
            </div>
            
            <div className="flex space-x-2">
              <button 
                onClick={() => handleAction('attack')}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Attack
              </button>
              <button 
                onClick={() => handleAction('defend')}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Defend
              </button>
              <button 
                onClick={() => handleAction('use_item')}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Use Item
              </button>
            </div>
          </div>
          
          {/* Chat Area */}
          <div className="bg-white border rounded-lg overflow-hidden flex flex-col h-96">
            <div className="bg-gray-800 text-white p-2">
              <h3 className="font-semibold">Game Chat</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`text-sm ${msg.isSystem ? 'text-gray-500 italic' : ''}`}
                >
                  <span className="text-gray-500 text-xs">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="ml-2">{msg.text}</span>
                </div>
              ))}
            </div>
            
            <form onSubmit={handleSendMessage} className="border-t p-2">
              <div className="flex">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 border rounded-l px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600 focus:outline-none"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Players in Game ({players.length})</h3>
          <div className="flex flex-wrap gap-2">
            {players.length > 0 ? (
              players.map(playerId => (
                <span 
                  key={playerId} 
                  className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded"
                >
                  {playerId === user?.id ? 'You' : playerId}
                </span>
              ))
            ) : (
              <p className="text-gray-500">No players in the game yet</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="text-sm text-gray-500 text-center">
        Connection status: {isConnected ? 'Connected' : 'Disconnected'}
      </div>
    </div>
  );
}
