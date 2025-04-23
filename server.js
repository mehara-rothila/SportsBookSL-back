// server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const http = require('http'); // Import Node's HTTP module
const { Server } = require("socket.io"); // Import Socket.IO Server
const jwt = require('jsonwebtoken'); // To verify tokens for socket auth
const User = require('./models/User'); // To find user from token

const connectDB = require('./config/db'); // Assuming path is correct
const apiRoutes = require('./routes'); // Main API router from routes/index.js
const { notFound, errorHandler } = require('./middleware/errorMiddleware'); // Assuming path is correct

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();

// Create HTTP server and integrate Express
const server = http.createServer(app);

// --- Initialize Socket.IO ---
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000", // Allow frontend origin
    methods: ["GET", "POST"]
  }
});

// --- Middleware ---
app.use(cors()); // Enable CORS early

// --- Serve Static Files ---
app.use(express.static(path.join(__dirname, 'public')));

// --- Basic Route for Testing ---
app.get('/', (req, res) => {
  res.send('SportsBookSL API Running...');
});

// --- Mount API Routes ---
app.use('/api', apiRoutes);

// --- Socket.IO Connection Logic ---
const onlineUsers = new Map(); // Simple in-memory store: userId -> socket.id

io.on('connection', (socket) => {
  console.log(`[Socket.IO] User connected: ${socket.id}`);

  // Handle authentication attempt from client
  socket.on('authenticate', async (token) => {
    if (!token) {
      console.log(`[Socket.IO] Auth failed: No token provided for ${socket.id}`);
      socket.disconnect(true); // Disconnect if no token
      return;
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;

      // Optional: Verify user exists in DB
      const userExists = await User.findById(userId).select('_id');
      if (!userExists) {
         console.log(`[Socket.IO] Auth failed: User ${userId} not found for ${socket.id}`);
         socket.disconnect(true);
         return;
      }

      console.log(`[Socket.IO] User ${userId} authenticated for socket ${socket.id}`);
      onlineUsers.set(userId.toString(), socket.id); // Store mapping
      socket.join(userId.toString()); // Join a room named after the userId

      // Optional: Send confirmation back to client
      socket.emit('authenticated');

    } catch (error) {
      console.error(`[Socket.IO] Auth failed for socket ${socket.id}:`, error.message);
      socket.disconnect(true); // Disconnect on verification failure
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] User disconnected: ${socket.id}`);
    // Remove user from mapping on disconnect
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`[Socket.IO] Removed user ${userId} from online map.`);
        break;
      }
    }
  });
});
// --- End Socket.IO Logic ---

// --- Error Handling Middleware ---
// Apply LAST for Express routes
app.use(notFound);
app.use(errorHandler);

// --- Server Startup ---
const PORT = process.env.PORT || 5001;
// Listen on the HTTP server, not the Express app directly
server.listen(PORT, () =>
  console.log(
    `Server (with Socket.IO) running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`
  )
);

// --- Export io instance for use in other modules ---
// This is a simple way, consider dependency injection for larger apps
module.exports.io = io;
module.exports.onlineUsers = onlineUsers; // Export map if needed directly elsewhere (less ideal)