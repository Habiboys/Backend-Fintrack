// controllers/transactionController.js
const { Transaction, Account, Category } = require('../models');
const { Op } = require('sequelize');


// Get all transactions for logged in user
exports.getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.findAll({
      where: { user_id: req.user.id },
      include: [
        { model: Account, attributes: ['name', 'type'] },
        { model: Category, attributes: ['name', 'type', 'color', 'icon'] }
      ],
      order: [['transaction_date', 'DESC']]
    });
    res.json({ data: transactions });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get recent transactions
exports.getRecentTransactions = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    const transactions = await Transaction.findAll({
      where: { user_id: req.user.id },
      include: [
        { model: Account, attributes: ['name', 'type'] },
        { model: Category, attributes: ['name', 'type', 'color', 'icon'] }
      ],
      order: [['transaction_date', 'DESC']],
      limit
    });
    res.json({ data: transactions });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get transactions by type (income/expense)
exports.getTransactionsByType = async (req, res) => {
  try {
    const transactions = await Transaction.findAll({
      where: { 
        user_id: req.user.id,
        transaction_type: req.params.type 
      },
      include: [
        { model: Account, attributes: ['name', 'type'] },
        { model: Category, attributes: ['name', 'type', 'color', 'icon'] }
      ],
      order: [['transaction_date', 'DESC']]
    });
    res.json({ data: transactions });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get transaction by ID
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      where: { 
        id: req.params.id,
        user_id: req.user.id 
      },
      include: [
        { model: Account, attributes: ['name', 'type'] },
        { model: Category, attributes: ['name', 'type', 'color', 'icon'] }
      ]
    });
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    res.json({ data: transaction });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new transaction
exports.createTransaction = async (req, res) => {
  try {
    const { 
      account_id, 
      category_id, 
      amount, 
      description, 
      transaction_date, 
      transaction_type 
    } = req.body;
    
    console.log(`Creating transaction: ${JSON.stringify(req.body)}`);
    
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
    
    // Handle account validation only if account_id is provided
    let account = null;
    if (account_id) {
      // Verify account belongs to user
      account = await Account.findOne({
        where: { 
          id: account_id,
          user_id: req.user.id 
        }
      });
      
      if (!account) {
        return res.status(404).json({ message: 'Account not found' });
      }
    }
    
    // Create transaction without account if not provided
    const transactionData = {
      user_id: req.user.id,
      category_id,
      amount,
      description,
      transaction_date,
      transaction_type
    };
    
    // Only add account_id if an account was found or provided
    if (account) {
      transactionData.account_id = account_id;
    }
    
    console.log(`Creating transaction with data: ${JSON.stringify(transactionData)}`);
    
    // Create transaction
    const transaction = await Transaction.create(transactionData);
    
    // Update account balance only if account exists
    if (account) {
      if (transaction_type === 'income') {
        account.balance = parseFloat(account.balance) + parseFloat(amount);
      } else if (transaction_type === 'expense') {
        account.balance = parseFloat(account.balance) - parseFloat(amount);
      }
      
      await account.save();
    }
    
    res.status(201).json({ 
      message: 'Transaction created successfully', 
      data: transaction 
    });
  } catch (error) {
    logger.error(`Error creating transaction: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update transaction
exports.updateTransaction = async (req, res) => {
  try {
    const { 
      account_id, 
      category_id, 
      amount, 
      description, 
      transaction_date, 
      transaction_type 
    } = req.body;
    
    const transaction = await Transaction.findOne({
      where: { 
        id: req.params.id,
        user_id: req.user.id 
      }
    });
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    // If account is changing, verify new account belongs to user
    let oldAccount, newAccount;
    if (account_id && account_id !== transaction.account_id) {
      oldAccount = await Account.findByPk(transaction.account_id);
      newAccount = await Account.findOne({
        where: { 
          id: account_id,
          user_id: req.user.id 
        }
      });
      
      if (!newAccount) {
        return res.status(404).json({ message: 'Account not found' });
      }
    }
    
    // If category is changing, verify new category belongs to user
    if (category_id && category_id !== transaction.category_id) {
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
    
    // Revert old account balance
    if (oldAccount) {
      if (transaction.transaction_type === 'income') {
        oldAccount.balance = parseFloat(oldAccount.balance) - parseFloat(transaction.amount);
      } else if (transaction.transaction_type === 'expense') {
        oldAccount.balance = parseFloat(oldAccount.balance) + parseFloat(transaction.amount);
      }
      await oldAccount.save();
    }
    
    // Update transaction
    transaction.account_id = account_id || transaction.account_id;
    transaction.category_id = category_id || transaction.category_id;
    transaction.amount = amount !== undefined ? amount : transaction.amount;
    transaction.description = description || transaction.description;
    transaction.transaction_date = transaction_date || transaction.transaction_date;
    transaction.transaction_type = transaction_type || transaction.transaction_type;
    transaction.updated_at = new Date();
    
    await transaction.save();
    
    // Update new account balance
    if (newAccount) {
      if (transaction.transaction_type === 'income') {
        newAccount.balance = parseFloat(newAccount.balance) + parseFloat(transaction.amount);
      } else if (transaction.transaction_type === 'expense') {
        newAccount.balance = parseFloat(newAccount.balance) - parseFloat(transaction.amount);
      }
      await newAccount.save();
    } else if (amount !== undefined && amount !== transaction.amount) {
      // If amount changed but account didn't, update the current account
      const account = await Account.findByPk(transaction.account_id);
      const amountDiff = parseFloat(amount) - parseFloat(transaction.amount);
      
      if (transaction.transaction_type === 'income') {
        account.balance = parseFloat(account.balance) + amountDiff;
      } else if (transaction.transaction_type === 'expense') {
        account.balance = parseFloat(account.balance) - amountDiff;
      }
      
      await account.save();
    }
    
    res.json({ 
      message: 'Transaction updated successfully', 
      data: transaction 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete transaction
exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      where: { 
        id: req.params.id,
        user_id: req.user.id 
      }
    });
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    // Update account balance
    const account = await Account.findByPk(transaction.account_id);
    
    if (transaction.transaction_type === 'income') {
      account.balance = parseFloat(account.balance) - parseFloat(transaction.amount);
    } else if (transaction.transaction_type === 'expense') {
      account.balance = parseFloat(account.balance) + parseFloat(transaction.amount);
    }
    
    await account.save();
    await transaction.destroy();
    
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};