const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const authMiddleware = require('../middleware/authMiddleware');

// Route untuk update FCM token
router.post('/update-fcm-token', authMiddleware, notificationController.updateFcmToken);

// Route untuk testing notifikasi (opsional, bisa dihapus di production)
router.post('/send-test', authMiddleware, notificationController.sendTestNotification);

module.exports = router; 