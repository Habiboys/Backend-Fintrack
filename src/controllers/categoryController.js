// controllers/categoryController.js
const { Category } = require('../models');

// Get all categories for logged in user
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { user_id: req.user.id }
    });
    res.json({ data: categories });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get categories by type (income/expense)
exports.getCategoriesByType = async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { 
        user_id: req.user.id,
        type: req.params.type 
      }
    });
    res.json({ data: categories });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findOne({
      where: { 
        id: req.params.id,
        user_id: req.user.id 
      }
    });
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json({ data: category });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new category
exports.createCategory = async (req, res) => {
  try {
    const { name, type, color, icon } = req.body;
    
    const category = await Category.create({
      user_id: req.user.id,
      name,
      type,
      color,
      icon
    });
    
    res.status(201).json({ 
      message: 'Category created successfully', 
      data: category 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const { name, type, color, icon } = req.body;
    
    const category = await Category.findOne({
      where: { 
        id: req.params.id,
        user_id: req.user.id 
      }
    });
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    category.name = name || category.name;
    category.type = type || category.type;
    category.color = color || category.color;
    category.icon = icon || category.icon;
    
    await category.save();
    
    res.json({ 
      message: 'Category updated successfully', 
      data: category 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findOne({
      where: { 
        id: req.params.id,
        user_id: req.user.id 
      }
    });
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    await category.destroy();
    
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};