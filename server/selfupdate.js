const { exec } = require('child_process');
module.exports = function selfUpdate(req, res) {
  if (req.headers['x-admin-token'] !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Admin authorization required' });
  }
  if (String(process.env.ALLOW_SELF_UPDATE || '').toLowerCase() !== 'true') {
    return res.status(403).json({ error: 'Self-update is disabled' });
  }
  exec('git pull && npm ci && pm2 restart all', (err, stdout, stderr) => {
    if (err) return res.status(500).json({error:stderr});
    res.json({ok:true, message:stdout});
  });
};
