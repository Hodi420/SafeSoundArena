const fs = require('fs');
const path = require('path');
const memPath = path.join(__dirname, 'user-memories.json');

function loadMemories() {
  if (!fs.existsSync(memPath)) return {};
  return JSON.parse(fs.readFileSync(memPath, 'utf8'));
}
function saveMemories(memories) {
  fs.writeFileSync(memPath, JSON.stringify(memories, null, 2));
}

function updateUserMemory(userId, data) {
  const memories = loadMemories();
  memories[userId] = { ...(memories[userId] || {}), ...data };
  saveMemories(memories);
}

function getUserMemory(userId) {
  const memories = loadMemories();
  return memories[userId] || {};
}

module.exports = { updateUserMemory, getUserMemory };
