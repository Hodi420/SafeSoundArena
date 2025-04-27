const express = require('express');
const multer = require('multer');
const nsfw = require('nsfwjs');
const sharp = require('sharp');
const Filter = require('bad-words');
const crypto = require('crypto');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const filter = new Filter();
let nsfwModel = null;

// Load NSFW model at server start
(async () => {
  nsfwModel = await nsfw.load();
})();

// Helper: GDPR consent check
function checkConsent(req, res, next) {
  if (!req.body.consent && !(req.file && req.body && req.body.consent)) {
    return res.status(403).json({ error: 'Consent required under GDPR.' });
  }
  next();
}

// Profanity filter endpoint
router.post('/text', checkConsent, (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Missing text' });
  const isProfane = filter.isProfane(text);
  const clean = filter.clean(text);
  res.json({ isProfane, clean });
});

// Image moderation endpoint
router.post('/image', upload.single('image'), checkConsent, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Missing image' });
  if (!nsfwModel) return res.status(503).json({ error: 'Model not loaded' });
  // Downscale for faster inference
  const image = await sharp(req.file.buffer).resize(299, 299).toBuffer();
  const predictions = await nsfwModel.classify(image);
  // GDPR: Do not save image, do not log PII
  res.json({ predictions });
});

// Diagnostics endpoint (example)
router.post('/diagnostics', checkConsent, (req, res) => {
  const { fps, usingIGPU, onBattery, memGB, cores } = req.body;
  // Minimal retention: Only log if problematic
  if (fps < 30 || usingIGPU || onBattery) {
    // Store anonymized hash only
    const anonId = crypto.createHash('sha256').update(req.ip + Date.now().toString()).digest('hex');
    // Example: store in DB (not implemented here)
    // db.saveDiagnostics({ anonId, fps, usingIGPU, onBattery, memGB, cores, ts: Date.now() });
  }
  res.json({ ok: true });
});

// Data deletion endpoint (GDPR right to be forgotten)
router.post('/delete', (req, res) => {
  // Example: remove user data by anonId (not implemented here)
  res.json({ deleted: true });
});

module.exports = router;
