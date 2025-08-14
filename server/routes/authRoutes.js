const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/user');

// רישום משתמש חדש
router.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      email,
      password: hashedPassword,
      onboardingComplete: false
    });

    await user.save();
    res.status(201).json({ message: 'משתמש נוצר בהצלחה' });
  } catch (error) {
    res.status(500).json({ error: 'שגיאה ביצירת משתמש' });
  }
});

// התחברות משתמש
router.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'פרטי התחברות לא תקינים' });
    }

    const accessToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ accessToken });
  } catch (error) {
    res.status(500).json({ error: 'שגיאה בהתחברות' });
  }
});

module.exports = router;