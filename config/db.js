const mysql = require("mysql2/promise");

// create pool (recommended for async/await + multiple queries)
const pool = mysql.createPool({
  host: "localhost",       // your MySQL host
  user: "root",            // your MySQL username
  password: "Duvijaa18@mepco",// your MySQL password
  database: "farmconnect", // your database name
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
