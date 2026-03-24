const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Tunisian car — identify vehicle + return contacts
router.post('/tunisian', authController.tunisianAuth);

// Send OTP to chosen contact
router.post('/send-otp', authController.sendOTP);

// Foreign car authentication
router.post('/foreign', authController.foreignAuth);

// OTP verification
router.post('/verify-otp', authController.verifyOTP);

module.exports = router;