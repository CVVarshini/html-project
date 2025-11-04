const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const http = require('http');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const { initializeChat, getPreviousMessages } = require('./routes/chatBackend');

const app = express();
const server = http.createServer(app);

// CORS configuration
app.use(cors({
  origin: 'http://localhost:3000', // adjust if frontend runs on another port
  credentials: true,
}));

// Middleware
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use("/photos", express.static(path.join(__dirname, "photos")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Session config
app.use(session({
  secret: 'your_secret_key_change_this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 3600000,
    httpOnly: true,
    sameSite: 'lax',
    secure: false
  }
}));

// Routes
app.use('/', authRoutes);
app.use("/api", profileRoutes);
app.use('/api', productRoutes);
app.use('/api/cart', cartRoutes);

// Chat initialization
initializeChat(server);

// Chat API
app.get('/api/chat/messages', getPreviousMessages);

// Serve home page
app.get('/home', (req, res) => {
  if (req.session && req.session.userId) {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
  } else {
    res.status(401).send('Unauthorized! Please login.');
  }
});

// ✅ Start using `server.listen` (NOT app.listen)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server and Socket.IO running on port ${PORT}`);
});
