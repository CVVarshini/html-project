const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

// ✅ Create MySQL connection pool for your FreeSQLDatabase
const pool = mysql.createPool({
  host: 'sql5.freesqldatabase.com',
  user: 'sql5806056',
  password: 'Hj4vvHRFEB',
  database: 'sql5806056',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ✅ Test the connection immediately
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Successfully connected to the FreeSQLDatabase!');
    connection.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }
})();

// ✅ Example signup route (you can modify your real logic below)
router.post('/signup', async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await pool.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, password]);
    res.status(200).json({ message: 'User registered successfully!' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ Example login route
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
    if (rows.length > 0) {
      res.status(200).json({ message: 'Login successful!' });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
