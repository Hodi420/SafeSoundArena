# WebSocket Events Documentation

This document outlines the WebSocket-based real-time communication protocol used in SafeSoundArena. All WebSocket connections are established at `ws://your-server/ws`.

## Connection Establishment

### Authentication

Before any game events can be sent or received, the client must authenticate:

```javascript
// Client-side connection example
const socket = new WebSocket('ws://your-server/ws?token=YOUR_JWT_TOKEN');
```

## Event Types

### 1. Game Events

#### `game:create`

**Direction**: Client → Server  
**Description**: Create a new game instance  
**Payload**:

```json
{
  "type": "standard" | "ranked" | "custom",
  "private": boolean,
  "settings": {}
}
```

#### `game:created`

**Direction**: Server → Client  
**Description**: Confirmation of game creation  
**Payload**:

```json
{
  "gameId": "unique-game-id",
  "status": "waiting"
}
```

#### `game:join`

**Direction**: Client → Server  
**Description**: Join an existing game  
**Payload**:

```json
{
  "gameId": "target-game-id"
}
```

#### `game:player-joined`

**Direction**: Server → Client  
**Description**: Notify all players when a new player joins  
**Payload**:

```json
{
  "gameId": "game-id",
  "playerId": "player-id",
  "players": ["player1-id", "player2-id"]
}
```

#### `game:move`

**Direction**: Client → Server  
**Description**: Submit a game move  
**Payload**:

```json
{
  "gameId": "game-id",
  "move": {},
  "timestamp": 1620000000
}
```

#### `game:state-update`

**Direction**: Server → Client  
**Description**: Game state update  
**Payload**:

```json
{
  "gameId": "game-id",
  "state": {},
  "currentPlayer": "player-id",
  "status": "waiting" | "in_progress" | "completed",
  "winner": "player-id" | null
}
```

### 2. Chat Events

#### `chat:message`

**Direction**: Client → Server  
**Description**: Send a chat message  
**Payload**:

```json
{
  "gameId": "game-id",
  "message": "Hello, players!",
  "type": "text" | "system"
}
```

#### `chat:message-received`

**Direction**: Server → Client  
**Description**: Broadcast received message to all players  
**Payload**:

```json
{
  "gameId": "game-id",
  "senderId": "player-id",
  "message": "Hello, players!",
  "timestamp": "2023-01-01T12:00:00Z",
  "type": "text" | "system"
}
```

### 3. Connection Events

#### `connection:heartbeat`

**Direction**: Both  
**Description**: Keep-alive ping/pong  
**Payload**:

```json
{
  "timestamp": 1620000000
}
```

#### `connection:error`

**Direction**: Server → Client  
**Description**: Error notification  
**Payload**:

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {}
}
```

## Error Codes

| Code          | Description                                |
| ------------- | ------------------------------------------ |
| AUTH_REQUIRED | Authentication token is missing or invalid |
| INVALID_GAME  | Game ID is invalid or game doesn't exist   |
| GAME_FULL     | Game has reached maximum player capacity   |
| INVALID_MOVE  | The submitted move is not valid            |
| NOT_YOUR_TURN | It's not the player's turn                 |
| RATE_LIMITED  | Too many requests, please slow down        |

## Implementation Example

```javascript
// Client-side WebSocket implementation example
class GameClient {
  constructor(token) {
    this.socket = new WebSocket(`ws://your-server/ws?token=${token}`);
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.socket.onopen = () => {
      console.log('Connected to game server');
    };

    this.socket.onmessage = (event) => {
      const { type, payload } = JSON.parse(event.data);

      switch (type) {
        case 'game:state-update':
          this.handleGameStateUpdate(payload);
          break;
        case 'chat:message-received':
          this.handleChatMessage(payload);
          break;
        // Handle other event types...
      }
    };
  }

  joinGame(gameId) {
    this.send('game:join', { gameId });
  }

  sendChatMessage(message) {
    this.send('chat:message', {
      gameId: this.currentGameId,
      message,
      type: 'text',
    });
  }

  send(type, payload) {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }));
    }
  }
}
```

## Best Practices

1. Always implement reconnection logic
2. Handle connection drops gracefully
3. Validate all incoming messages
4. Use the heartbeat mechanism to detect connection issues
5. Implement rate limiting on the client side
6. Encrypt sensitive data before sending
7. Handle backpressure for high-frequency updates

## Security Considerations

- Always use WSS (WebSocket Secure) in production
- Validate all incoming messages on the server
- Implement proper authentication and authorization
- Rate limit message frequency
- Sanitize all chat messages to prevent XSS
- Use message signing for critical operations
