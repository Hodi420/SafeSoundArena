const { exec } = require('child_process');
module.exports = function selfUpdate(req, res) {
  exec('git pull && npm ci && pm2 restart all', (err, stdout, stderr) => {
    if (err) return res.status(500).json({error:stderr});
    res.json({ok:true, message:stdout});
  });
};
