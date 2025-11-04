const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Duvijaa18@mepco',
      database: 'farmconnect'
    });
    console.log('✅ Database connected!');
    await connection.end();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }
}

testConnection();
