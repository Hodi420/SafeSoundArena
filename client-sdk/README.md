# SafeSoundArena Client SDK

A lightweight JavaScript client library for interacting with the SafeSoundArena game server. This SDK simplifies WebSocket communication and provides a clean API for game-related operations.

## Features

- 🔌 Automatic reconnection with exponential backoff
- 💓 Built-in heartbeat mechanism
- 🎮 Easy-to-use game and chat APIs
- 🔄 Request/response pattern with timeouts
- 📡 Event-based architecture
- 🔒 Secure WebSocket connection (WSS)
- 📦 Works in browsers and Node.js

## Installation

### Browser (via CDN)

```html
<script src="https://cdn.jsdelivr.net/npm/@safesoundarena/client-sdk@latest/dist/safesoundarena-client.min.js"></script>
```

### NPM

```bash
npm install @safesoundarena/client-sdk
```

## Quick Start

```javascript
// Import the SDK
import SafeSoundArenaClient from '@safesoundarena/client-sdk';
// or in CommonJS: const SafeSoundArenaClient = require('@safesoundarena/client-sdk');

// Initialize the client
const client = new SafeSoundArenaClient({
  serverUrl: 'wss://api.safesoundarena.com',
  authToken: 'your-jwt-token',
  callbacks: {
    onConnected: () => console.log('Connected to game server'),
    onDisconnected: () => console.log('Disconnected from server'),
    onError: (error) => console.error('Error:', error.message),
    onGameState: (state) => console.log('Game state updated:', state),
    onChatMessage: (message) => console.log('New message:', message),
    onPlayerJoined: (player) => console.log('Player joined:', player),
    onPlayerLeft: (player) => console.log('Player left:', player),
  },
});

// Connect to the server
client.connect();

// Create a new game
const game = await client.createGame({
  type: 'standard',
  private: true,
});
console.log('Created game:', game);

// Send a chat message
await client.sendChatMessage(game.gameId, 'Hello, players!');

// Make a move
await client.makeMove(game.gameId, {
  // Your move details here
  x: 1,
  y: 2,
  type: 'move',
});

// Disconnect when done
// client.disconnect();
```

## API Reference

### `new SafeSoundArenaClient(options)`

Creates a new client instance.

**Options:**

- `serverUrl` (string, required): WebSocket server URL (e.g., 'wss://api.safesoundarena.com')
- `authToken` (string, required): JWT authentication token
- `callbacks` (object): Event callbacks
  - `onConnected`: Called when connected to the server
  - `onDisconnected`: Called when disconnected from the server
  - `onError`: Called when an error occurs
  - `onGameState`: Called when game state updates
  - `onChatMessage`: Called when a chat message is received
  - `onPlayerJoined`: Called when a player joins the game
  - `onPlayerLeft`: Called when a player leaves the game

### Instance Methods

#### `connect()`

Connects to the game server.

#### `disconnect()`

Disconnects from the game server.

#### `createGame(options)`: `Promise<Object>`

Creates a new game.

**Parameters:**

- `options` (object): Game options
  - `type` (string): Game type ('standard', 'ranked', 'custom')
  - `private` (boolean): Whether the game is private
  - `settings` (object): Additional game settings

**Returns:** Promise that resolves with game details

#### `joinGame(gameId)`: `Promise<Object>`

Joins an existing game.

**Parameters:**

- `gameId` (string): ID of the game to join

**Returns:** Promise that resolves with game state

#### `makeMove(gameId, move)`: `Promise<Object>`

Makes a move in the current game.

**Parameters:**

- `gameId` (string): ID of the game
- `move` (object): Move details

**Returns:** Promise that resolves with updated game state

#### `sendChatMessage(gameId, message, type = 'text')`: `Promise<void>`

Sends a chat message.

**Parameters:**

- `gameId` (string): ID of the game
- `message` (string): Message text
- `type` (string): Message type ('text' or 'system')

#### `send(type, payload, expectResponse = false)`: `Promise<any>`

Sends a custom message to the server.

**Parameters:**

- `type` (string): Message type
- `payload` (object): Message payload
- `expectResponse` (boolean): Whether to expect a response

**Returns:** Promise that resolves with the response if `expectResponse` is true

## Error Handling

All errors are passed to the `onError` callback and include a `code` property for programmatic handling:

```javascript
client.callbacks.onError = (error) => {
  switch (error.code) {
    case 'AUTH_FAILED':
      // Handle authentication errors
      break;
    case 'CONNECTION_ERROR':
      // Handle connection errors
      break;
    // ... other error cases
  }
};
```

## Reconnection

The SDK automatically handles reconnection with exponential backoff. You can listen for connection state changes:

```javascript
client.callbacks.onDisconnected = (event) => {
  console.log('Disconnected, attempting to reconnect...');
};

client.callbacks.onConnected = () => {
  console.log('Reconnected successfully!');
};
```

## License

MIT © SafeSoundArena
