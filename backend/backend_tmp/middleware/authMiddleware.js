const jwt = require('jsonwebtoken');

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

const handleRefreshToken = (req, res) => {
  const refreshToken = req.body.token;
  if (!refreshToken) return res.sendStatus(401);

  // כאן יש להוסיף לוגיקה לבדיקת refresh token מול מאגר נתונים
  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    const accessToken = jwt.sign({ username: user.username }, process.env.JWT_SECRET, { expiresIn: '15m' });
    res.json({ accessToken });
  });
};

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'שגיאה פנימית בשרת' });
};

const roleGuard = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'אין הרשאה מתאימה' });
    }
    next();
  };
};

module.exports = {
  authenticateJWT,
  handleRefreshToken,
  errorHandler,
  roleGuard
};