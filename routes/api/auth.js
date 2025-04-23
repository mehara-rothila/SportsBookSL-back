// routes/api/auth.js
const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
  forgotPassword,
  resetPassword, // Controller name stays the same
} = require('../../controllers/authController'); // Adjust path if needed
const { protect } = require('../../middleware/authMiddleware'); // Adjust path if needed

router.use(express.json()); // Apply JSON parser

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.post('/forgotpassword', forgotPassword);
// --- MODIFIED ROUTE ---
router.put('/resetpassword', resetPassword); // No token in URL needed, uses PUT
// --- END MODIFIED ROUTE ---

module.exports = router;