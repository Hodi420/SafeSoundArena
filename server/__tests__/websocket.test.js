const WebSocket = require('ws');
const { expect } = require('chai');
const { v4: uuidv4 } = require('uuid');
const server = require('../server');
const { createToken } = require('../utils/auth');

const TEST_PORT = 3001;
const WS_URL = `ws://localhost:${TEST_PORT}`;

// Test user data
const testUser = {
  id: 'test-user-123',
  address: '0x1234567890123456789012345678901234567890',
  username: 'testuser'
};

// Generate JWT token for testing
const token = createToken(testUser);

describe('WebSocket Server', function() {
  // Increase timeout for WebSocket tests
  this.timeout(10000);
  
  let wsClient;
  
  // Setup test server before tests
  before((done) => {
    // Start the server on test port
    server.listen(TEST_PORT, () => {
      console.log(`Test server running on port ${TEST_PORT}`);
      done();
    });
  });
  
  // Cleanup after tests
  after(() => {
    if (wsClient) {
      wsClient.terminate();
    }
    server.close();
  });
  
  describe('Connection', () => {
    it('should connect with valid token', (done) => {
      wsClient = new WebSocket(WS_URL, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      wsClient.on('open', () => {
        expect(wsClient.readyState).to.equal(WebSocket.OPEN);
        done();
      });
      
      wsClient.on('error', (error) => {
        done(error);
      });
    });
    
    it('should reject connection without token', (done) => {
      const client = new WebSocket(WS_URL);
      
      client.on('error', (error) => {
        expect(error.message).to.include('Unexpected server response: 401');
        client.terminate();
        done();
      });
    });
  });
  
  describe('Game Events', () => {
    let gameId;
    
    beforeEach((done) => {
      wsClient = new WebSocket(WS_URL, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      wsClient.on('open', () => {
        done();
      });
    });
    
    afterEach(() => {
      if (wsClient) {
        wsClient.terminate();
      }
    });
    
    it('should create a new game', (done) => {
      const testGame = {
        type: 'CREATE_GAME',
        payload: {
          betAmount: '1.0',
          gameType: 'tic-tac-toe'
        }
      };
      
      wsClient.send(JSON.stringify(testGame));
      
      wsClient.on('message', (data) => {
        const message = JSON.parse(data);
        
        if (message.type === 'GAME_CREATED') {
          expect(message.payload).to.have.property('gameId');
          expect(message.payload.players).to.include(testUser.id);
          gameId = message.payload.gameId;
          done();
        }
      });
    });
    
    it('should handle game moves', (done) => {
      const move = {
        type: 'MAKE_MOVE',
        payload: {
          gameId,
          move: { x: 0, y: 0, player: testUser.id }
        }
      };
      
      wsClient.send(JSON.stringify(move));
      
      wsClient.on('message', (data) => {
        const message = JSON.parse(data);
        
        if (message.type === 'MOVE_MADE' && message.payload.gameId === gameId) {
          expect(message.payload.move).to.deep.equal(move.payload.move);
          done();
        }
      });
    });
    
    it('should handle chat messages', (done) => {
      const chatMessage = {
        type: 'CHAT_MESSAGE',
        payload: {
          gameId,
          message: 'Hello, world!',
          sender: testUser.username
        }
      };
      
      wsClient.send(JSON.stringify(chatMessage));
      
      wsClient.on('message', (data) => {
        const message = JSON.parse(data);
        
        if (message.type === 'CHAT_MESSAGE' && message.payload.gameId === gameId) {
          expect(message.payload.message).to.equal(chatMessage.payload.message);
          expect(message.payload.sender).to.equal(testUser.username);
          done();
        }
      });
    });
  });
});
