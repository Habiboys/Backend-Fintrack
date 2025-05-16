// controllers/budgetController.js
const { Budget, Category, Transaction } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('sequelize');

// Get all budgets for logged in user
exports.getBudgets = async (req, res) => {
  try {
    const budgets = await Budget.findAll({
      where: { user_id: req.user.id },
      include: [{ model: Category, attributes: ['name', 'type', 'color', 'icon'] }]
    });
    res.json({ data: budgets });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get budget summary with spending progress
exports.getBudgetSummary = async (req, res) => {
  try {
    const budgets = await Budget.findAll({
      where: { 
        user_id: req.user.id,
        // Only get active budgets
        [Op.and]: [
          { start_date: { [Op.lte]: new Date() } },
          { end_date: { [Op.gte]: new Date() } }
        ]
      },
      include: [{ model: Category, attributes: ['name', 'type', 'color', 'icon'] }]
    });
    
    // For each budget, calculate spending
    const budgetSummary = await Promise.all(budgets.map(async (budget) => {
      // Get transactions for this category within budget period
      const transactions = await Transaction.findAll({
        where: {
          user_id: req.user.id,
          category_id: budget.category_id,
          transaction_date: {
            [Op.between]: [budget.start_date, budget.end_date]
          },
          transaction_type: 'expense'
        },
        attributes: [
          [sequelize.fn('SUM', sequelize.col('amount')), 'total']
        ],
        raw: true
      });
      
      const spent = transactions[0].total || 0;
      const remaining = budget.amount - spent;
      const progress = (spent / budget.amount) * 100;
      
      return {
        id: budget.id,
        name: budget.name || `Budget for ${budget.Category?.name || 'Unknown Category'}`,
        category: budget.Category,
        category_id: budget.category_id,
        amount: budget.amount,
        spent,
        remaining,
        progress: Math.min(progress, 100), // Cap at 100%
        period: budget.period,
        start_date: budget.start_date,
        end_date: budget.end_date
      };
    }));
    
    res.json({ data: budgetSummary });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get budget by ID
exports.getBudgetById = async (req, res) => {
  try {
    const budget = await Budget.findOne({
      where: { 
        id: req.params.id,
        user_id: req.user.id 
      },
      include: [{ model: Category, attributes: ['name', 'type', 'color', 'icon'] }]
    });
    
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }
    
    res.json({ data: budget });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new budget
exports.createBudget = async (req, res) => {
  try {
    const { name, category_id, amount, period, start_date, end_date } = req.body;
    
    // Verify category belongs to user
    const category = await Category.findOne({
      where: { 
        id: category_id,
        user_id: req.user.id 
      }
    });
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Check if budget already exists for this category and period
    const existingBudget = await Budget.findOne({
      where: {
        user_id: req.user.id,
        category_id,
        [Op.or]: [
          {
            [Op.and]: [
              { start_date: { [Op.lte]: start_date } },
              { end_date: { [Op.gte]: start_date } }
            ]
          },
          {
            [Op.and]: [
              { start_date: { [Op.lte]: end_date } },
              { end_date: { [Op.gte]: end_date } }
            ]
          },
          {
            [Op.and]: [
              { start_date: { [Op.gte]: start_date } },
              { end_date: { [Op.lte]: end_date } }
            ]
          }
        ]
      }
    });
    
    if (existingBudget) {
      return res.status(400).json({ 
        message: 'A budget already exists for this category during this period' 
      });
    }
    
    const budget = await Budget.create({
      user_id: req.user.id,
      category_id,
      name,
      amount,
      period,
      start_date,
      end_date
    });
    
    res.status(201).json({ 
      message: 'Budget created successfully', 
      data: budget 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update budget
exports.updateBudget = async (req, res) => {
  try {
    const { name, category_id, amount, period, start_date, end_date } = req.body;
    
    const budget = await Budget.findOne({
      where: { 
        id: req.params.id,
        user_id: req.user.id 
      }
    });
    
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }
    
    // If category is changing, verify new category belongs to user
    if (category_id && category_id !== budget.category_id) {
      const category = await Category.findOne({
        where: { 
          id: category_id,
          user_id: req.user.id 
        }
      });
      
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
    }
    
    // Check for overlapping budgets if dates are changing
    if ((start_date && start_date !== budget.start_date) || 
        (end_date && end_date !== budget.end_date)) {
      const newStartDate = start_date || budget.start_date;
      const newEndDate = end_date || budget.end_date;
      
      const existingBudget = await Budget.findOne({
        where: {
          user_id: req.user.id,
          category_id: category_id || budget.category_id,
          id: { [Op.ne]: budget.id }, // Exclude current budget
          [Op.or]: [
            {
              [Op.and]: [
                { start_date: { [Op.lte]: newStartDate } },
                { end_date: { [Op.gte]: newStartDate } }
              ]
            },
            {
              [Op.and]: [
                { start_date: { [Op.lte]: newEndDate } },
                { end_date: { [Op.gte]: newEndDate } }
              ]
            },
            {
              [Op.and]: [
                { start_date: { [Op.gte]: newStartDate } },
                { end_date: { [Op.lte]: newEndDate } }
              ]
            }
          ]
        }
      });
      
      if (existingBudget) {
        return res.status(400).json({ 
          message: 'A budget already exists for this category during this period' 
        });
      }
    }
    
    budget.category_id = category_id || budget.category_id;
    budget.amount = amount !== undefined ? amount : budget.amount;
    budget.period = period || budget.period;
    budget.start_date = start_date || budget.start_date;
    budget.end_date = end_date || budget.end_date;
    budget.name = name || budget.name;
    budget.updated_at = new Date();
    
    await budget.save();
    
    res.json({ 
      message: 'Budget updated successfully', 
      data: budget 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete budget
exports.deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findOne({
      where: { 
        id: req.params.id,
        user_id: req.user.id 
      }
    });
    
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }
    
    await budget.destroy();
    
    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};