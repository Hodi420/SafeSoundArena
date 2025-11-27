const gameService = require('../services/gameService');
const logger = require('../utils/logger');

class GameEventHandler {
  constructor(wss) {
    this.wss = wss;
    this.playerConnections = new Map(); // playerId -> WebSocket
  }

  initialize() {
    this.wss.on('connection', (ws, req) => {
      const playerId = this.authenticateConnection(req);
      if (!playerId) {
        ws.close(1008, 'Unauthorized');
        return;
      }

      this.playerConnections.set(playerId, ws);
      logger.info(`Player ${playerId} connected to WebSocket`);

      ws.on('message', (message) => this.handleMessage(playerId, message));
      ws.on('close', () => this.handleDisconnect(playerId));
      ws.on('error', (error) => this.handleError(playerId, error));
    });
  }

  authenticateConnection(req) {
    // In a real implementation, you would validate the JWT token from the request
    // For now, we'll just use a query parameter for simplicity
    const url = new URL(req.url, `http://${req.headers.host}`);
    return url.searchParams.get('playerId');
  }

  async handleMessage(playerId, message) {
    try {
      const { event, data } = JSON.parse(message);
      logger.info(`Received ${event} from ${playerId}`);

      switch (event) {
        case 'game:create':
          await this.handleCreateGame(playerId, data);
          break;
        case 'game:join':
          await this.handleJoinGame(playerId, data);
          break;
        case 'game:move':
          await this.handleMakeMove(playerId, data);
          break;
        case 'game:leave':
          await this.handleLeaveGame(playerId, data);
          break;
        case 'game:chat':
          this.handleChatMessage(playerId, data);
          break;
        default:
          logger.warn(`Unknown event type: ${event}`);
      }
    } catch (error) {
      logger.error(`Error handling message from ${playerId}:`, error);
      this.sendToPlayer(playerId, 'error', { message: error.message });
    }
  }

  async handleCreateGame(playerId, { opponentId, betAmount = '0' }) {
    const game = await gameService.createGame(playerId, opponentId, betAmount);
    this.sendToPlayer(playerId, 'game:created', { game });

    // Notify the opponent if they're connected
    if (this.playerConnections.has(opponentId)) {
      this.sendToPlayer(opponentId, 'game:invite', {
        gameId: game.id,
        opponent: playerId,
        betAmount,
      });
    }
  }

  async handleJoinGame(playerId, { gameId }) {
    const game = gameService.getGame(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    if (!game.players.includes(playerId)) {
      throw new Error('You are not a player in this game');
    }

    // If the game was waiting for this player, start it
    if (game.status === 'waiting' && game.players[1] === playerId) {
      game.status = 'in_progress';
      gameService.pendingGames.delete(gameId);
      gameService.activeGames.set(gameId, game);
    }

    // Send the current game state to the player
    this.sendToPlayer(playerId, 'game:state', { game });

    // Notify the other player that someone joined
    const opponentId = game.players.find((id) => id !== playerId);
    if (opponentId && this.playerConnections.has(opponentId)) {
      this.sendToPlayer(opponentId, 'game:player_joined', {
        gameId,
        playerId,
      });
    }
  }

  async handleMakeMove(playerId, { gameId, move }) {
    const game = await gameService.makeMove(gameId, playerId, move);

    // Broadcast the move to all players in the game
    this.broadcastToGame(gameId, 'game:move_made', {
      gameId,
      playerId,
      move,
      gameState: game,
    });

    // If the game is over, notify the players
    if (game.status === 'completed') {
      this.broadcastToGame(gameId, 'game:ended', {
        gameId,
        winner: game.winner,
        finalState: game,
      });
    }
  }

  async handleLeaveGame(playerId, { gameId }) {
    const game = gameService.getGame(gameId);
    if (!game) return;

    // Notify the other player
    const opponentId = game.players.find((id) => id !== playerId);
    if (opponentId && this.playerConnections.has(opponentId)) {
      this.sendToPlayer(opponentId, 'game:player_left', {
        gameId,
        playerId,
      });
    }

    // Clean up the game if it's no longer active
    if (game.status === 'waiting' || game.players.length <= 1) {
      gameService.pendingGames.delete(gameId);
      gameService.activeGames.delete(gameId);
    }
  }

  handleChatMessage(senderId, { gameId, message }) {
    const game = gameService.getGame(gameId);
    if (!game || !game.players.includes(senderId)) return;

    // Broadcast the chat message to all players in the game
    this.broadcastToGame(gameId, 'game:chat', {
      gameId,
      senderId,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(playerId) {
    logger.info(`Player ${playerId} disconnected`);
    this.playerConnections.delete(playerId);

    // Notify any games this player was in
    const activeGames = [...gameService.activeGames.values()];
    const playerGames = activeGames.filter((game) => game.players.includes(playerId));

    playerGames.forEach((game) => {
      this.broadcastToGame(game.id, 'game:player_disconnected', {
        gameId: game.id,
        playerId,
      });
    });
  }

  handleError(playerId, error) {
    logger.error(`WebSocket error for player ${playerId}:`, error);
    this.playerConnections.delete(playerId);
  }

  // Helper methods
  sendToPlayer(playerId, event, data) {
    const ws = this.playerConnections.get(playerId);
    if (ws && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ event, data }));
    }
  }

  broadcastToGame(gameId, event, data) {
    const game = gameService.getGame(gameId);
    if (!game) return;

    game.players.forEach((playerId) => {
      this.sendToPlayer(playerId, event, data);
    });
  }
}

module.exports = GameEventHandler;
