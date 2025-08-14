const express = require('express');
const router = express.Router();
const User = require('../models/user');

// קבלת לוח התוצאות
router.get('/api/leaderboard', async (req, res) => {
  try {
    const users = await User.find({})
      .sort({ score: -1 })
      .limit(10)
      .select('name score -_id');
    
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בקבלת נתוני לוח התוצאות' });
  }
});

module.exports = router;