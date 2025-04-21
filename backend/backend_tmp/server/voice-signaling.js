// Full backend signaling server for spatial voice chat (Node.js + socket.io)
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Map usernames to socket IDs
const usernameToSocketId = new Map();

io.on('connection', (socket) => {
  // Handle user join (from jail lobby)
  socket.on('joinJail', (profile) => {
    if (profile && profile.username) {
      usernameToSocketId.set(profile.username, socket.id);
      socket.username = profile.username;
    }
    // Broadcast updated user list if needed
  });

  // Clean up on disconnect
  socket.on('disconnect', () => {
    if (socket.username) {
      usernameToSocketId.delete(socket.username);
    }
  });

  // Clean up on explicit leave
  socket.on('leaveJail', () => {
    if (socket.username) {
      usernameToSocketId.delete(socket.username);
    }
  });

  // WebRTC signaling relay
  socket.on('signal', ({ to, from, signal }) => {
    const recipientSocketId = usernameToSocketId.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('signal', { from, signal });
    }
  });

  // Voice chat join/leave logic
  socket.on('joinVoice', () => {
    if (socket.username) {
      socket.join('voiceRoom');
      updateVoiceUsers();
    }
  });
  socket.on('leaveVoice', () => {
    if (socket.username) {
      socket.leave('voiceRoom');
      updateVoiceUsers();
    }
  });

  function updateVoiceUsers() {
    const sockets = io.sockets.adapter.rooms.get('voiceRoom') || new Set();
    const usernames = Array.from(sockets).map(
      id => Array.from(usernameToSocketId.entries()).find(([, sid]) => sid === id)?.[0]
    ).filter(Boolean);
    io.to('voiceRoom').emit('voiceUsers', usernames);
  }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Voice signaling server running on port ${PORT}`);
});
