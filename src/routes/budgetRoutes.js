// routes/budgetRoutes.js
const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const authMiddleware = require('../middleware/authMiddleware');

// Protect all routes
router.use(authMiddleware);

// Get all budgets
router.get('/', budgetController.getBudgets);

// Get budget summary with spending progress
router.get('/summary', budgetController.getBudgetSummary);

// Get budget by ID
router.get('/:id', budgetController.getBudgetById);

// Create new budget
router.post('/', budgetController.createBudget);

// Update budget
router.put('/:id', budgetController.updateBudget);

// Delete budget
router.delete('/:id', budgetController.deleteBudget);

module.exports = router;