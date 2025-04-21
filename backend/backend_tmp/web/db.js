const sql = require('mssql');

const config = {
  user: process.env.AZURE_SQL_USER,
  password: process.env.AZURE_SQL_PASSWORD,
  server: process.env.AZURE_SQL_SERVER,
  database: process.env.AZURE_SQL_DATABASE,
  options: {
    encrypt: process.env.AZURE_SQL_ENCRYPT === 'true', // for Azure
    enableArithAbort: true
  }
};

async function getPool() {
  if (!global._sqlPool) {
    global._sqlPool = await sql.connect(config);
  }
  return global._sqlPool;
}

module.exports = { sql, getPool };
