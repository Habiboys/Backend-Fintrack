// controllers/accountController.js
const { Account } = require('../models');

// Get all accounts for logged in user
exports.getAccounts = async (req, res) => {
  try {
    const accounts = await Account.findAll({
      where: { user_id: req.user.id }
    });
    res.json({ data: accounts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get account by ID
exports.getAccountById = async (req, res) => {
  try {
    const account = await Account.findOne({
      where: { 
        id: req.params.id,
        user_id: req.user.id 
      }
    });
    
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }
    
    res.json({ data: account });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new account
exports.createAccount = async (req, res) => {
  try {
    const { name, type, balance, currency } = req.body;
    
    const account = await Account.create({
      user_id: req.user.id,
      name,
      type,
      balance,
      currency
    });
    
    res.status(201).json({ 
      message: 'Account created successfully', 
      data: account 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update account
exports.updateAccount = async (req, res) => {
  try {
    const { name, type, balance, currency } = req.body;
    
    const account = await Account.findOne({
      where: { 
        id: req.params.id,
        user_id: req.user.id 
      }
    });
    
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }
    
    account.name = name || account.name;
    account.type = type || account.type;
    account.balance = balance !== undefined ? balance : account.balance;
    account.currency = currency || account.currency;
    account.updated_at = new Date();
    
    await account.save();
    
    res.json({ 
      message: 'Account updated successfully', 
      data: account 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete account
exports.deleteAccount = async (req, res) => {
  try {
    const account = await Account.findOne({
      where: { 
        id: req.params.id,
        user_id: req.user.id 
      }
    });
    
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }
    
    await account.destroy();
    
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};