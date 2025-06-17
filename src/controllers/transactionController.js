// controllers/transactionController.js
const { Transaction, Account, Category, User, Budget } = require('../models');
const { Op } = require('sequelize');
const notificationService = require('../services/notification.service');
const { formatCurrency } = require('../utils/formatter');
const sequelize = require('sequelize');


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
    
    console.log('Creating new transaction:', {
      userId: req.user.id,
      amount,
      type: transaction_type,
      category_id,
      account_id
    });
    
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
    
    console.log('Creating transaction with data:', transactionData);
    
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

    // Kirim notifikasi transaksi
    try {
      const formattedAmount = formatCurrency(amount);
      const transactionType = transaction_type === 'income' ? 'Pemasukan' : 'Pengeluaran';
      
      console.log('Sending notification for transaction:', {
        userId: req.user.id,
        type: transactionType,
        amount: formattedAmount
      });

      await notificationService.sendNotification(
        req.user.id,
        'Transaksi Baru',
        `${transactionType} sebesar ${formattedAmount} telah dicatat`,
        {
          type: 'transaction',
          transactionId: transaction.id.toString(),
          transactionType: transaction_type,
          amount: amount.toString(),
          click_action: 'FLUTTER_NOTIFICATION_CLICK'
        }
      );

      // Jika transaksi adalah pengeluaran, cek budget
      if (transaction_type === 'expense') {
        // Cek budget untuk kategori ini
        const budget = await Budget.findOne({
          where: {
            user_id: req.user.id,
            category_id,
            [Op.and]: [
              { start_date: { [Op.lte]: transaction_date } },
              { end_date: { [Op.gte]: transaction_date } }
            ]
          }
        });

        if (budget) {
          // Hitung total pengeluaran untuk budget ini
          const transactions = await Transaction.findAll({
            where: {
              user_id: req.user.id,
              category_id,
              transaction_type: 'expense',
              transaction_date: {
                [Op.between]: [budget.start_date, budget.end_date]
              }
            },
            attributes: [
              [sequelize.fn('SUM', sequelize.col('amount')), 'total']
            ],
            raw: true
          });

          const totalSpent = parseFloat(transactions[0].total || 0);
          const percentageUsed = (totalSpent / budget.amount) * 100;

          console.log(`Budget check - Total spent: ${totalSpent}, Budget: ${budget.amount}, Used: ${percentageUsed}%`);

          // Kirim notifikasi jika mencapai 80% atau melebihi budget
          if (percentageUsed >= 80 && percentageUsed < 100) {
            const remainingAmount = budget.amount - totalSpent;
            console.log(`Budget warning: ${budget.name} remaining ${remainingAmount}`);

            await notificationService.sendNotification(
              req.user.id,
              'Peringatan Anggaran',
              `Anggaran ${budget.name || category.name} Anda tersisa ${formatCurrency(remainingAmount)} (${Math.round(100 - percentageUsed)}%)`,
              {
                type: 'budget_warning',
                budgetId: budget.id.toString(),
                percentageUsed: Math.round(percentageUsed).toString(),
                remainingAmount: remainingAmount.toString()
              }
            );
          } else if (percentageUsed >= 100) {
            const overAmount = totalSpent - budget.amount;
            console.log(`Budget exceeded: ${budget.name} by ${overAmount}`);

            await notificationService.sendNotification(
              req.user.id,
              'Anggaran Terlampaui',
              `Anggaran ${budget.name || category.name} telah terlampaui sebesar ${formatCurrency(overAmount)}`,
              {
                type: 'budget_exceeded',
                budgetId: budget.id.toString(),
                percentageUsed: Math.round(percentageUsed).toString(),
                overAmount: overAmount.toString()
              }
            );
          }
        }
      }

    } catch (notifError) {
      console.error('Error sending notification:', notifError);
      // Lanjutkan eksekusi meskipun notifikasi gagal
    }
    
    res.status(201).json({ 
      message: 'Transaction created successfully', 
      data: transaction 
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
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