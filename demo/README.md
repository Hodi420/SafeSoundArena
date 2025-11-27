# SafeSoundArena Demo

This is a demo application showcasing the SafeSoundArena client SDK with a Tic-Tac-Toe game implementation.

## Features

- 🎮 Real-time multiplayer Tic-Tac-Toe game
- 💬 In-game chat
- 🔄 Automatic reconnection
- 📱 Responsive UI
- 🔍 Debug console

## Prerequisites

- Node.js 14.0 or higher
- npm or yarn

## Getting Started

### 1. Install Dependencies

```bash
# Install server dependencies
cd demo
npm install

# Install client SDK dependencies
cd ../client-sdk
npm install
```

### 2. Build the Client SDK

```bash
# From the client-sdk directory
npm run build
```

### 3. Start the Demo Server

```bash
# From the demo directory
npm start
```

### 4. Open the Demo in Your Browser

Open two browser windows and navigate to:

```
http://localhost:4000
```

## How to Play

1. Open the demo in two browser windows (or use incognito mode)
2. The first player will automatically create a game
3. The second player will join automatically
4. Players take turns clicking on the board to place their symbol (X or O)
5. First to get three in a row wins!
6. Use the chat to communicate with your opponent

## Project Structure

- `index.html` - Main HTML file
- `app.js` - Client-side JavaScript
- `server.js` - WebSocket game server
- `package.json` - Server dependencies and scripts
- `client-sdk/` - The SafeSoundArena client SDK

## Development

To run the server in development mode with auto-restart:

```bash
npm run dev
```

## License

MIT © SafeSoundArena Team
