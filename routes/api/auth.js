// routes/api/auth.js
const express = require('express');
const router = express.Router();
const User = require('../../models/User'); // Add this import
const mongoose = require('mongoose'); // Add this import
const {
  registerUser,
  loginUser,
  getMe,
  forgotPassword,
  resetPassword,
} = require('../../controllers/authController');
const { protect } = require('../../middleware/authMiddleware');

router.use(express.json()); // Apply JSON parser

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword', resetPassword);

// Add diagnostic routes
router.get('/check-user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    console.log(`[check-user] Checking if user exists: ${email}`);
    
    console.log(`[check-user] MongoDB connection state: ${mongoose.connection.readyState}`);
    
    const user = await User.findOne({ email }).select('email');
    
    res.json({
      userExists: !!user,
      dbConnected: mongoose.connection.readyState === 1,
      email: email
    });
  } catch (error) {
    console.error(`[check-user] Error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Add test login route for debugging
router.get('/test-db', async (req, res) => {
  try {
    console.log('[test-db] Testing database connection');
    const connectionState = mongoose.connection.readyState;
    const stateMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    // Get count of users as a connection test
    const userCount = await User.countDocuments();
    
    res.json({
      dbState: connectionState,
      dbStateText: stateMap[connectionState] || 'unknown',
      userCount: userCount,
      envVars: {
        nodeEnv: process.env.NODE_ENV,
        mongoUri: process.env.MONGO_URI ? 'Set (not showing value)' : 'Not set',
        jwtSecret: process.env.JWT_SECRET ? 'Set (not showing value)' : 'Not set',
        jwtExpire: process.env.JWT_EXPIRE
      }
    });
  } catch (error) {
    console.error('[test-db] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;