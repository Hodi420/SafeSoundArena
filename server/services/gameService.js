const logger = require('../utils/logger');
const blockchainService = require('./blockchainService');

class GameService {
  constructor() {
    this.activeGames = new Map();
    this.pendingGames = new Map();
  }

  async createGame(player1, player2, betAmount = '0') {
    try {
      const gameId = `game_${Date.now()}`;
      const gameState = {
        id: gameId,
        players: [player1, player2],
        currentPlayer: player1,
        board: this.initializeBoard(),
        status: 'waiting',
        betAmount,
        createdAt: new Date(),
        moves: [],
      };

      this.pendingGames.set(gameId, gameState);

      // If bet amount is greater than 0, lock the funds
      if (parseFloat(betAmount) > 0) {
        // In a real implementation, you would lock the funds in the blockchain
        logger.info(`Locking ${betAmount} tokens for game ${gameId}`);
      }

      return gameState;
    } catch (error) {
      logger.error('Error creating game:', error);
      throw new Error('Failed to create game');
    }
  }

  async makeMove(gameId, player, move) {
    const game = this.activeGames.get(gameId) || this.pendingGames.get(gameId);

    if (!game) {
      throw new Error('Game not found');
    }

    if (game.currentPlayer !== player) {
      throw new Error('Not your turn');
    }

    if (game.status !== 'in_progress' && game.status !== 'waiting') {
      throw new Error('Game is not in progress');
    }

    // Validate the move
    if (!this.isValidMove(game, move)) {
      throw new Error('Invalid move');
    }

    // Update game state
    game.moves.push({
      player,
      move,
      timestamp: new Date(),
    });

    // Check for win condition
    const winner = this.checkWinCondition(game);
    if (winner) {
      game.winner = winner;
      game.status = 'completed';

      // Process the bet if there is one
      if (parseFloat(game.betAmount) > 0) {
        await this.processGameResult(game);
      }
    } else {
      // Switch players
      game.currentPlayer = game.players.find((p) => p !== player);
    }

    // If this was the first move, start the game
    if (game.status === 'waiting') {
      game.status = 'in_progress';
      this.pendingGames.delete(gameId);
      this.activeGames.set(gameId, game);
    }

    return game;
  }

  async processGameResult(game) {
    try {
      const { winner, players, betAmount } = game;
      const loser = players.find((p) => p !== winner);

      if (parseFloat(betAmount) > 0) {
        // Record the game result on the blockchain
        await blockchainService.executeGameResult(winner, loser, betAmount);
        logger.info(`Processed game result: ${winner} won ${betAmount} from ${loser}`);
      }

      return true;
    } catch (error) {
      logger.error('Error processing game result:', error);
      // In a production environment, you might want to implement a retry mechanism here
      throw new Error('Failed to process game result');
    }
  }

  getGame(gameId) {
    return this.activeGames.get(gameId) || this.pendingGames.get(gameId);
  }

  getPlayerGames(playerId) {
    const allGames = [...this.activeGames.values(), ...this.pendingGames.values()];
    return allGames.filter((game) => game.players.includes(playerId));
  }

  // Helper methods
  initializeBoard() {
    // Initialize a 3x3 game board
    return [
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ];
  }

  isValidMove(game, move) {
    const { row, col } = move;
    // Check if the move is within bounds
    if (row < 0 || row > 2 || col < 0 || col > 2) {
      return false;
    }
    // Check if the cell is already taken
    return game.board[row][col] === null;
  }

  checkWinCondition(game) {
    const { board, currentPlayer } = game;

    // Check rows
    for (let i = 0; i < 3; i++) {
      if (
        board[i][0] === currentPlayer &&
        board[i][1] === currentPlayer &&
        board[i][2] === currentPlayer
      ) {
        return currentPlayer;
      }
    }

    // Check columns
    for (let i = 0; i < 3; i++) {
      if (
        board[0][i] === currentPlayer &&
        board[1][i] === currentPlayer &&
        board[2][i] === currentPlayer
      ) {
        return currentPlayer;
      }
    }

    // Check diagonals
    if (
      board[0][0] === currentPlayer &&
      board[1][1] === currentPlayer &&
      board[2][2] === currentPlayer
    ) {
      return currentPlayer;
    }

    if (
      board[0][2] === currentPlayer &&
      board[1][1] === currentPlayer &&
      board[2][0] === currentPlayer
    ) {
      return currentPlayer;
    }

    // Check for draw
    if (game.moves.length === 9) {
      return 'draw';
    }

    return null;
  }
}

module.exports = new GameService();
