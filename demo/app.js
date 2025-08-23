// Game state
const gameState = {
  board: Array(9).fill(''),
  currentPlayer: '',
  playerSymbol: '',
  gameId: null,
  playerId: null,
  opponentId: null,
  gameStatus: 'disconnected',
};

// DOM Elements
const elements = {
  gameBoard: document.getElementById('gameBoard'),
  gameStatus: document.getElementById('gameStatus'),
  chatMessages: document.getElementById('chatMessages'),
  chatInput: document.getElementById('chatInput'),
  sendBtn: document.getElementById('sendBtn'),
  newGameBtn: document.getElementById('newGameBtn'),
  connectionStatus: document.getElementById('connectionStatus'),
  connectionText: document.getElementById('connectionText'),
  playerId: document.getElementById('playerId'),
  gameId: document.getElementById('gameId'),
  debugLog: document.getElementById('debugLog'),
};

// Initialize the game board
function initializeBoard() {
  elements.gameBoard.innerHTML = '';
  gameState.board.forEach((cell, index) => {
    const cellElement = document.createElement('div');
    cellElement.className = `cell ${cell.toLowerCase()}`;
    cellElement.textContent = cell;
    cellElement.dataset.index = index;
    cellElement.addEventListener('click', handleCellClick);
    elements.gameBoard.appendChild(cellElement);
  });
  updateBoard();
}

// Update the board UI based on game state
function updateBoard() {
  document.querySelectorAll('.cell').forEach((cell, index) => {
    cell.textContent = gameState.board[index] || '';
    cell.className = `cell ${gameState.board[index] ? gameState.board[index].toLowerCase() : ''}`;
    
    // Disable cell if it's not the player's turn or the cell is already taken
    cell.style.pointerEvents = 
      gameState.gameStatus !== 'in_progress' || 
      gameState.board[index] || 
      gameState.currentPlayer !== gameState.playerId ? 'none' : 'auto';
  });
}

// Handle cell click
function handleCellClick(event) {
  const index = parseInt(event.target.dataset.index);
  
  // Don't allow moves on occupied cells or when it's not the player's turn
  if (gameState.board[index] || gameState.currentPlayer !== gameState.playerId) {
    return;
  }
  
  // Make the move
  client.makeMove(gameState.gameId, { 
    position: index,
    symbol: gameState.playerSymbol 
  }).catch(error => {
    logError('Move failed:', error);
  });
}

// Update game status display
function updateStatus(message) {
  elements.gameStatus.textContent = message;
}

// Add a message to the chat
function addChatMessage(message, type = 'system', sender = 'System') {
  const messageElement = document.createElement('div');
  messageElement.className = `message ${type === 'self' ? 'self' : type === 'system' ? 'system' : 'other'}`;
  
  if (type === 'system') {
    messageElement.textContent = message;
  } else {
    const senderElement = document.createElement('div');
    senderElement.className = 'text-xs font-semibold';
    senderElement.textContent = sender;
    
    const contentElement = document.createElement('div');
    contentElement.textContent = message;
    
    messageElement.appendChild(senderElement);
    messageElement.appendChild(contentElement);
  }
  
  elements.chatMessages.appendChild(messageElement);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

// Log debug information
function logDebug(message) {
  const logEntry = document.createElement('div');
  logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  elements.debugLog.appendChild(logEntry);
  elements.debugLog.scrollTop = elements.debugLog.scrollHeight;
}

// Log error
function logError(message, error) {
  console.error(message, error);
  logDebug(`[ERROR] ${message} ${error?.message || ''}`);
}

// Initialize the client
const client = new SafeSoundArenaClient({
  serverUrl: 'ws://localhost:4000', // Update this to your server URL
  callbacks: {
    onConnected: () => {
      logDebug('Connected to game server');
      updateConnectionStatus(true);
      
      // Generate a random player ID for demo purposes
      // In a real app, this would come from your authentication system
      gameState.playerId = `player_${Math.random().toString(36).substr(2, 9)}`;
      elements.playerId.textContent = gameState.playerId;
      
      // Enable UI elements
      elements.newGameBtn.disabled = false;
      
      // Join a game automatically for demo purposes
      client.createGame({ type: 'standard' })
        .then(game => {
          gameState.gameId = game.gameId;
          elements.gameId.textContent = game.gameId;
          updateStatus('Waiting for opponent...');
        })
        .catch(error => {
          logError('Failed to create game:', error);
        });
    },
    
    onDisconnected: (event) => {
      logDebug(`Disconnected: ${event.code} - ${event.reason || 'No reason provided'}`);
      updateConnectionStatus(false);
      updateStatus('Disconnected from server. Reconnecting...');
    },
    
    onError: (error) => {
      logError('Connection error:', error);
      updateConnectionStatus(false);
    },
    
    onGameState: (state) => {
      logDebug('Game state updated:', state);
      
      // Update game state
      gameState.board = state.board || Array(9).fill('');
      gameState.currentPlayer = state.currentPlayer;
      gameState.gameStatus = state.status;
      
      // Update player symbols if this is the first state update
      if (state.players) {
        const playerIndex = state.players.indexOf(gameState.playerId);
        if (playerIndex !== -1) {
          gameState.playerSymbol = playerIndex === 0 ? 'X' : 'O';
          gameState.opponentId = state.players[playerIndex === 0 ? 1 : 0];
        }
      }
      
      // Update UI
      updateBoard();
      
      // Update status message
      if (state.status === 'waiting') {
        updateStatus('Waiting for opponent...');
      } else if (state.status === 'in_progress') {
        if (gameState.currentPlayer === gameState.playerId) {
          updateStatus('Your turn!');
        } else {
          updateStatus(`Waiting for ${gameState.opponentId || 'opponent'}...`);
        }
      } else if (state.status === 'completed') {
        if (state.winner === gameState.playerId) {
          updateStatus('You won! 🎉');
        } else if (state.winner) {
          updateStatus('You lost! Better luck next time.');
        } else {
          updateStatus("It's a draw!");
        }
      }
    },
    
    onChatMessage: (message) => {
      const isSelf = message.senderId === gameState.playerId;
      addChatMessage(
        message.content,
        isSelf ? 'self' : 'other',
        isSelf ? 'You' : message.senderId
      );
    },
    
    onPlayerJoined: (player) => {
      logDebug(`Player joined: ${player.playerId}`);
      if (player.playerId !== gameState.playerId) {
        addChatMessage(`${player.playerId} has joined the game`, 'system');
      }
    },
    
    onPlayerLeft: (player) => {
      logDebug(`Player left: ${player.playerId}`);
      if (player.playerId !== gameState.playerId) {
        addChatMessage(`${player.playerId} has left the game`, 'system');
      }
    }
  }
});

// Update connection status UI
function updateConnectionStatus(connected) {
  if (connected) {
    elements.connectionStatus.className = 'w-3 h-3 rounded-full bg-green-500 mr-2';
    elements.connectionText.textContent = 'Connected';
  } else {
    elements.connectionStatus.className = 'w-3 h-3 rounded-full bg-red-500 mr-2';
    elements.connectionText.textContent = 'Disconnected';
  }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Initialize the board
  initializeBoard();
  
  // Connect to the server
  client.connect();
  
  // New Game button
  elements.newGameBtn.addEventListener('click', () => {
    client.createGame({ type: 'standard' })
      .then(game => {
        gameState.gameId = game.gameId;
        elements.gameId.textContent = game.gameId;
        updateStatus('Waiting for opponent...');
      })
      .catch(error => {
        logError('Failed to create game:', error);
      });
  });
  
  // Send chat message
  function sendChatMessage() {
    const message = elements.chatInput.value.trim();
    if (!message) return;
    
    client.sendChatMessage(gameState.gameId, message)
      .then(() => {
        elements.chatInput.value = '';
      })
      .catch(error => {
        logError('Failed to send message:', error);
      });
  }
  
  elements.sendBtn.addEventListener('click', sendChatMessage);
  elements.chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendChatMessage();
    }
  });
  
  // Enable chat input when connected
  elements.chatInput.disabled = false;
  elements.sendBtn.disabled = false;
  
  // Add some helpful debug info
  logDebug('Demo application initialized');
  logDebug(`Player ID: ${gameState.playerId || 'Not connected'}`);
});
