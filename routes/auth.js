const express = require('express');
const {
  inviteAdmin,
  inviteUser,
  verifyUserOTP,
  setupPassword,
  login,
  getMe,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/invite-admin', inviteAdmin);
router.post('/verify-otp', verifyUserOTP);
router.post('/setup-password', setupPassword);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resettoken', resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.post('/invite-user', protect, authorize('admin'), inviteUser);

module.exports = router;