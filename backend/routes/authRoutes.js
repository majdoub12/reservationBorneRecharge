const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const ocrController = require('../controllers/ocrController');

// Tunisian car — identify vehicle + return contacts
router.post('/tunisian', authController.tunisianAuth);

// Send OTP to chosen contact (Tunisian flow)
router.post('/send-otp', authController.sendOTP);

// Foreign car — submit request to back-office
router.post('/foreign', authController.foreignAuth);


// Back-office approval/rejection (GET endpoints for email links)
router.get('/foreign/approve', authController.foreignApprove);
router.get('/foreign/reject', authController.foreignReject);

// OTP verification
router.post('/verify-otp', authController.verifyOTP);
router.post('/verify-foreign-otp', authController.verifyForeignOTP);

// Contact Management (Unprotected for identification flow)
router.get('/contacts/:vehicleId', authController.getContacts);
router.post('/add-contact', authController.addContact);
router.post('/delete-contact', authController.deleteContact);
router.post('/update-contact', authController.updateContact);


// Add this line — protected route to get vehicle from token
router.get('/me', authMiddleware, authController.getMyVehicle);

router.post('/ocr', ocrController.handleOCR);
module.exports = router;
