// routes/transactionRoutes.js
const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middleware/authMiddleware');

// Semua route memerlukan autentikasi
router.use(authMiddleware);

// Get all transactions
router.get('/', transactionController.getTransactions);

// Get recent transactions
router.get('/recent', transactionController.getRecentTransactions);

// Get transactions by type
router.get('/type/:type', transactionController.getTransactionsByType);

// Get transaction by ID
router.get('/:id', transactionController.getTransactionById);

// Create new transaction
router.post('/', transactionController.createTransaction);

// Update transaction
router.put('/:id', transactionController.updateTransaction);

// Delete transaction
router.delete('/:id', transactionController.deleteTransaction);

module.exports = router;