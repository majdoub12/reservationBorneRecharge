const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Tunisian car — identify vehicle + return contacts
router.post('/tunisian', authController.tunisianAuth);

// Send OTP to chosen contact (Tunisian flow)
router.post('/send-otp', authController.sendOTP);

// Foreign car — submit request to back-office
router.post('/foreign', authController.foreignAuth);

// Back-office approve/reject (called via email links)
router.get('/foreign/approve', authController.foreignApprove);
router.get('/foreign/reject',  authController.foreignReject);

// OTP verification
router.post('/verify-otp',         authController.verifyOTP);
router.post('/verify-foreign-otp', authController.verifyForeignOTP);

module.exports = router;