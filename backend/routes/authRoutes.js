// O:\JobConnector\backend\routes\authRoutes.js
const express = require('express');
const { requestOTP, verifyOTP } = require('../controllers/authController');

const router = express.Router();

router.post('/request-otp', requestOTP);
router.post('/verify-otp', verifyOTP);

module.exports = router;