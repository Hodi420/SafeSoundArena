# 🤖 Ollama Closed-Box Quick Reference Card

**Print this card or save to your phone**

---

## 🚀 Getting Started (5 Minutes)

### First Time Setup:
```bash
node ollama-quickstart.js
```
(Downloads model, installs dependencies)

### Daily Start:
```bash
# Terminal 1
npm start

# Terminal 2
cd frontend && npm run dev
```

### Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Ollama: http://localhost:11434

---

## 🔑 Key Environment Variables

```bash
# .env file
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=mistral
```

---

## 🆘 Quick Troubleshooting

| Problem | Command |
|---------|---------|
| Ollama not running | `docker ps \| grep ollama` |
| Restart Ollama | `docker-compose -f docker-compose.dev.yml restart ollama` |
| Check model downloaded | `curl http://localhost:11434/api/tags` |
| View backend logs | `docker logs safesoundarena-api-server-1` |
| Reset everything | `docker-compose -f docker-compose.dev.yml down -v` |

---

## 📊 Docker Services

```bash
# Start all
docker-compose -f docker-compose.dev.yml up

# List running
docker ps

# Stop all
docker-compose -f docker-compose.dev.yml down

# View logs
docker-compose -f docker-compose.dev.yml logs -f
```

---

## 🎮 Using AI in Code

### Simple Usage:
```javascript
const axios = require('axios');

const response = await axios.post('http://localhost:11434/api/generate', {
  model: 'mistral',
  prompt: 'Your question here',
  stream: false
});

console.log(response.data.response);
```

### Via SafeSoundArena:
```javascript
const { askAI } = require('./aiClients');
const response = await askAI(null, 'Your question', {});
```

---

## 🎯 Common Models

| Model | Size | Speed | Quality |
|-------|------|-------|---------|
| mistral | 7B | ⚡⚡⚡ | ⭐⭐⭐⭐ |
| openchat | 3.5B | ⚡⚡⚡⚡ | ⭐⭐⭐ |
| llama2 | 7B | ⚡⚡ | ⭐⭐⭐⭐ |

**Download new model:**
```bash
ollama pull openchat  # or any model name
```

**Change model in .env:**
```bash
OLLAMA_MODEL=openchat
```

---

## 🔗 Useful URLs

- Ollama Models: https://ollama.ai/library
- GitHub: https://github.com/ollama/ollama
- SafeSoundArena: https://github.com/Hodi420/SafeSoundArena

---

## 📝 Full Documentation

- **OLLAMA_CLOSED_BOX_GUIDE.md** - Complete setup
- **OLLAMA_EXAMPLES.js** - Code patterns
- **OLLAMA_CHECKLIST.md** - Full checklist
- **DEVELOPMENT_GUIDE.md** - Project guide

---

## ✅ Health Check

```bash
# Is everything running?
curl http://localhost:4000/api/health

# Expected output:
{
  "status": "ok",
  "ai_provider": "ollama",
  "ai_available": true,
  "models": ["mistral:latest"]
}
```

---

## 💾 Backup

Your models are in:
```bash
docker volume ls  # Find ollama_data
docker inspect safesoundarena_ollama_data  # See where stored
```

---

## 🚀 Pro Tips

✨ **GPU Support:** Uncomment in docker-compose.dev.yml
```yaml
# deploy:
#   resources:
#     reservations:
#       devices:
#         - driver: nvidia
```

✨ **Faster Model:** Use openchat (3.5B) instead of mistral

✨ **More Powerful:** Use llama2:13b (needs 16GB RAM)

✨ **Watch Logs:**
```bash
docker logs -f $(docker ps -q -f ancestor=ollama/ollama)
```

---

## 🎓 Learning

Read one file at a time in this order:
1. This card (you are here)
2. OLLAMA_IMPLEMENTATION_SUMMARY.md (why Ollama works)
3. OLLAMA_CLOSED_BOX_GUIDE.md (detailed setup)
4. OLLAMA_EXAMPLES.js (code examples)
5. OLLAMA_CHECKLIST.md (verification steps)

---

**Bookmark this file!** 📌

Last updated: 2026-05-15
SafeSoundArena + Ollama = Offline AI Gaming 🎮
