// routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middleware/authMiddleware');

// Semua route memerlukan autentikasi
router.use(authMiddleware);

// Get all categories
router.get('/', categoryController.getCategories);

// Get categories by type
router.get('/type/:type', categoryController.getCategoriesByType);

// Get category by ID
router.get('/:id', categoryController.getCategoryById);

// Create new category
router.post('/', categoryController.createCategory);

// Update category
router.put('/:id', categoryController.updateCategory);

// Delete category
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;