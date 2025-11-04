const socketIo = require('socket.io');
const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Duvijaa18@mepco',
  database: 'farmconnect',
};

const initializeChat = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  let onlineUsers = new Set();

  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    socket.join(userId);
    onlineUsers.add(userId);
    io.emit('online users', Array.from(onlineUsers));
    console.log(`User connected: ${userId}`);

    socket.on('private message', (msg) => {
      socket.to(msg.recipient).emit('private message', msg);
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      io.emit('online users', Array.from(onlineUsers));
      console.log(`User disconnected: ${userId}`);
    });
  });

  return io;
};

const getPreviousMessages = async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT * FROM messages ORDER BY timestamp ASC');
    await connection.end();
    res.json({ messages: rows });
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

module.exports = { initializeChat, getPreviousMessages };
