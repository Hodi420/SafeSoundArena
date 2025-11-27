const { expect } = require('chai');
const GameService = require('../services/gameService');
const blockchainService = require('../services/blockchainService');

// Mock blockchain service
jest.mock('../services/blockchainService');

describe('GameService', () => {
  let gameService;
  const testGameId = 'test-game-123';
  const player1 = {
    id: 'player1',
    address: '0x1234567890123456789012345678901234567890',
    username: 'testplayer1',
  };

  const player2 = {
    id: 'player2',
    address: '0x0987654321098765432109876543210987654321',
    username: 'testplayer2',
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Create a new game service instance
    gameService = new GameService();

    // Mock blockchain service responses
    blockchainService.executeGameResult.mockResolvedValue({
      transactionHash: '0x123...',
      status: true,
    });
  });

  describe('createGame', () => {
    it('should create a new game', () => {
      const game = gameService.createGame({
        gameId: testGameId,
        creator: player1,
        betAmount: '1.0',
        gameType: 'tic-tac-toe',
      });

      expect(game).toHaveProperty('id', testGameId);
      expect(game.players).toContainEqual(
        expect.objectContaining({
          id: player1.id,
          address: player1.address,
        })
      );
      expect(game.status).toBe('waiting');
    });
  });

  describe('joinGame', () => {
    it('should allow a player to join a game', () => {
      // First create a game
      gameService.createGame({
        gameId: testGameId,
        creator: player1,
        betAmount: '1.0',
        gameType: 'tic-tac-toe',
      });

      // Then join the game
      const game = gameService.joinGame(testGameId, player2);

      expect(game.players).toHaveLength(2);
      expect(game.players).toContainEqual(
        expect.objectContaining({
          id: player2.id,
          address: player2.address,
        })
      );
      expect(game.status).toBe('in_progress');
    });
  });

  describe('makeMove', () => {
    beforeEach(() => {
      // Create and join a game before each test
      gameService.createGame({
        gameId: testGameId,
        creator: player1,
        betAmount: '1.0',
        gameType: 'tic-tac-toe',
      });
      gameService.joinGame(testGameId, player2);
    });

    it('should process a valid move', () => {
      const move = { x: 0, y: 0, player: player1.id };
      const result = gameService.makeMove(testGameId, move);

      expect(result.valid).toBe(true);
      expect(result.game.moves).toContainEqual(expect.objectContaining(move));
    });

    it('should detect a win condition', () => {
      // Player 1 makes a winning move
      const moves = [
        { x: 0, y: 0, player: player1.id }, // X
        { x: 1, y: 0, player: player2.id }, // O
        { x: 0, y: 1, player: player1.id }, // X
        { x: 1, y: 1, player: player2.id }, // O
        { x: 0, y: 2, player: player1.id }, // X - wins
      ];

      let result;
      moves.forEach((move) => {
        result = gameService.makeMove(testGameId, move);
      });

      expect(result.game.status).toBe('completed');
      expect(result.game.winner).toBe(player1.id);
      expect(blockchainService.executeGameResult).toHaveBeenCalledWith(
        player1.address,
        player2.address,
        '1.0' // Bet amount
      );
    });
  });

  describe('endGame', () => {
    it('should end the game and record results', async () => {
      // Create and join a game
      gameService.createGame({
        gameId: testGameId,
        creator: player1,
        betAmount: '1.0',
        gameType: 'tic-tac-toe',
      });
      gameService.joinGame(testGameId, player2);

      // End the game with player1 as the winner
      const result = await gameService.endGame(testGameId, player1.id);

      expect(result.status).toBe('completed');
      expect(result.winner).toBe(player1.id);
      expect(blockchainService.executeGameResult).toHaveBeenCalledWith(
        player1.address,
        player2.address,
        '1.0' // Bet amount
      );
    });
  });

  describe('getGameState', () => {
    it('should return the current game state', () => {
      // Create a game
      gameService.createGame({
        gameId: testGameId,
        creator: player1,
        betAmount: '1.0',
        gameType: 'tic-tac-toe',
      });

      const gameState = gameService.getGameState(testGameId);

      expect(gameState).toHaveProperty('id', testGameId);
      expect(gameState.players).toHaveLength(1);
      expect(gameState.status).toBe('waiting');
    });
  });
});
