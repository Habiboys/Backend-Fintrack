// routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

// Semua route memerlukan autentikasi
router.use(authMiddleware);

// Get dashboard overview data
router.get('/', dashboardController.getDashboardData);

// Get spending overview by category
router.get('/spending-overview', dashboardController.getSpendingOverview);

// Get monthly summary (income vs expense)
router.get('/monthly-summary', dashboardController.getMonthlySummary);

// Get financial statistics
router.get('/stats', dashboardController.getFinancialStats);

module.exports = router;