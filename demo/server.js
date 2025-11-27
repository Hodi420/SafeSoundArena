const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files from the demo directory
app.use(express.static(path.join(__dirname)));

// Game state
const games = new Map();
const clients = new Map();

// Game logic
class TicTacToeGame {
  constructor(gameId) {
    this.id = gameId;
    this.players = [];
    this.spectators = [];
    this.board = Array(9).fill('');
    this.currentPlayer = 0;
    this.status = 'waiting';
    this.winner = null;
    this.moves = 0;
  }

  addPlayer(playerId) {
    if (this.players.length >= 2) {
      this.spectators.push(playerId);
      return false; // Player added as spectator
    }

    this.players.push(playerId);

    if (this.players.length === 2) {
      this.status = 'in_progress';
      this.broadcastGameState();
    }

    return true; // Player added as player
  }

  makeMove(playerId, position) {
    // Validate move
    if (this.status !== 'in_progress') return false;
    if (this.players[this.currentPlayer] !== playerId) return false;
    if (position < 0 || position >= 9 || this.board[position] !== '') return false;

    // Make the move
    const symbol = this.currentPlayer === 0 ? 'X' : 'O';
    this.board[position] = symbol;
    this.moves++;

    // Check for winner
    if (this.checkWin(symbol)) {
      this.status = 'completed';
      this.winner = playerId;
    } else if (this.moves === 9) {
      // Draw
      this.status = 'completed';
    } else {
      // Switch player
      this.currentPlayer = 1 - this.currentPlayer;
    }

    // Notify all clients
    this.broadcastGameState();
    return true;
  }

  checkWin(symbol) {
    const winPatterns = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8], // Rows
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8], // Columns
      [0, 4, 8],
      [2, 4, 6], // Diagonals
    ];

    return winPatterns.some((pattern) => pattern.every((index) => this.board[index] === symbol));
  }

  getState() {
    return {
      gameId: this.id,
      players: [...this.players],
      board: [...this.board],
      currentPlayer: this.players[this.currentPlayer],
      status: this.status,
      winner: this.winner,
      spectators: [...this.spectators],
    };
  }

  broadcastGameState() {
    const state = this.getState();
    const message = JSON.stringify({
      type: 'game:state-update',
      payload: state,
    });

    // Send to all players and spectators
    const allClients = [...this.players, ...this.spectators];
    allClients.forEach((playerId) => {
      const client = clients.get(playerId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  let currentGame = null;

  // Store the client
  clients.set(playerId, ws);

  // Send welcome message
  ws.send(
    JSON.stringify({
      type: 'connection:connected',
      payload: { playerId },
    })
  );

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'game:create':
          handleCreateGame(ws, playerId, message.payload);
          break;

        case 'game:join':
          handleJoinGame(ws, playerId, message.payload);
          break;

        case 'game:move':
          handleMakeMove(ws, playerId, message.payload);
          break;

        case 'chat:message':
          handleChatMessage(ws, playerId, message.payload);
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(
        JSON.stringify({
          type: 'error',
          payload: { message: 'Invalid message format' },
        })
      );
    }
  });

  // Handle client disconnection
  ws.on('close', () => {
    clients.delete(playerId);

    if (currentGame) {
      // Notify other players that this player left
      const game = games.get(currentGame);
      if (game) {
        const index = game.players.indexOf(playerId);
        if (index !== -1) {
          game.players.splice(index, 1);

          // If the game was in progress, end it
          if (game.status === 'in_progress') {
            game.status = 'completed';
            game.winner = game.players[0]; // The other player wins by default
          }

          game.broadcastGameState();
        }

        // Clean up empty games
        if (game.players.length === 0) {
          games.delete(currentGame);
        }
      }
    }
  });
});

// Message handlers
function handleCreateGame(ws, playerId, payload) {
  const gameId = `game_${Date.now()}`;
  const game = new TicTacToeGame(gameId);
  game.addPlayer(playerId);
  games.set(gameId, game);

  ws.send(
    JSON.stringify({
      type: 'game:created',
      payload: { gameId, status: 'waiting' },
    })
  );

  // Send initial game state
  ws.send(
    JSON.stringify({
      type: 'game:state-update',
      payload: game.getState(),
    })
  );
}

function handleJoinGame(ws, playerId, payload) {
  const game = games.get(payload.gameId);

  if (!game) {
    return ws.send(
      JSON.stringify({
        type: 'error',
        payload: { message: 'Game not found' },
      })
    );
  }

  const isPlayer = game.addPlayer(playerId);

  if (isPlayer) {
    // Notify the joining player
    ws.send(
      JSON.stringify({
        type: 'game:joined',
        payload: { gameId: game.id, status: game.status },
      })
    );

    // Send game state to the joining player
    ws.send(
      JSON.stringify({
        type: 'game:state-update',
        payload: game.getState(),
      })
    );

    // Notify other players
    game.players.forEach((id) => {
      if (id !== playerId) {
        const client = clients.get(id);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: 'game:player-joined',
              payload: { gameId: game.id, playerId },
            })
          );
        }
      }
    });
  } else {
    // Player joined as spectator
    ws.send(
      JSON.stringify({
        type: 'game:spectator-joined',
        payload: { gameId: game.id },
      })
    );

    // Send current game state to the spectator
    ws.send(
      JSON.stringify({
        type: 'game:state-update',
        payload: game.getState(),
      })
    );
  }
}

function handleMakeMove(ws, playerId, payload) {
  const game = games.get(payload.gameId);

  if (!game) {
    return ws.send(
      JSON.stringify({
        type: 'error',
        payload: { message: 'Game not found' },
      })
    );
  }

  const success = game.makeMove(playerId, payload.position);

  if (!success) {
    ws.send(
      JSON.stringify({
        type: 'error',
        payload: { message: 'Invalid move' },
      })
    );
  }
  // Game state is broadcast by makeMove()
}

function handleChatMessage(ws, playerId, payload) {
  const game = games.get(payload.gameId);

  if (!game) {
    return ws.send(
      JSON.stringify({
        type: 'error',
        payload: { message: 'Game not found' },
      })
    );
  }

  // Broadcast the message to all players in the game
  const allClients = [...game.players, ...game.spectators];
  const message = JSON.stringify({
    type: 'chat:message-received',
    payload: {
      gameId: game.id,
      senderId: playerId,
      content: payload.message,
      timestamp: new Date().toISOString(),
    },
  });

  allClients.forEach((id) => {
    const client = clients.get(id);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
