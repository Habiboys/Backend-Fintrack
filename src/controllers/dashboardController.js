// controllers/dashboardController.js
const { Transaction, Account, Category, Budget } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('sequelize');

// Get dashboard overview data
exports.getDashboardData = async (req, res) => {
  try {
    // Get total balance across all accounts
    const accounts = await Account.findAll({
      where: { user_id: req.user.id },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('balance')), 'totalBalance']
      ],
      raw: true
    });
    
    // Get income and expense totals for current month
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const incomeTotal = await Transaction.findAll({
      where: { 
        user_id: req.user.id,
        transaction_type: 'income',
        transaction_date: {
          [Op.between]: [firstDayOfMonth, lastDayOfMonth]
        }
      },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      raw: true
    });
    
    const expenseTotal = await Transaction.findAll({
      where: { 
        user_id: req.user.id,
        transaction_type: 'expense',
        transaction_date: {
          [Op.between]: [firstDayOfMonth, lastDayOfMonth]
        }
      },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      raw: true
    });
    
    // Get recent transactions
    const recentTransactions = await Transaction.findAll({
      where: { user_id: req.user.id },
      include: [
        { model: Account, attributes: ['name', 'type'] },
        { model: Category, attributes: ['name', 'type', 'color', 'icon'] }
      ],
      order: [['transaction_date', 'DESC']],
      limit: 5
    });
    
    // Get active budgets with progress
    const activeBudgets = await Budget.findAll({
      where: { 
        user_id: req.user.id,
        [Op.and]: [
          { start_date: { [Op.lte]: currentDate } },
          { end_date: { [Op.gte]: currentDate } }
        ]
      },
      include: [{ model: Category, attributes: ['name', 'type', 'color', 'icon'] }],
      limit: 5
    });
    
    // Calculate budget progress
    const budgetsWithProgress = await Promise.all(activeBudgets.map(async (budget) => {
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
        category: budget.Category,
        amount: budget.amount,
        spent,
        remaining,
        progress: Math.min(progress, 100) // Cap at 100%
      };
    }));
    
    // Get user info
    const user = await req.user;
    
    // Calculate financial data
    const accountBalance = accounts[0].totalBalance || 0;
    const monthlyIncome = incomeTotal[0].total || 0;
    const monthlyExpense = expenseTotal[0].total || 0;
    const currentNetBalance = parseFloat(accountBalance) + parseFloat(monthlyIncome) - parseFloat(monthlyExpense);
    
    res.json({ 
      data: {
        user: {
          id: user.id,
          username: user.username,
          fullname: user.fullname,
          email: user.email,
          joinDate: user.created_at
        },
        accountBalance: accountBalance,  // Total saldo rekening saja
        totalBalance: currentNetBalance, // Total saldo rekening + income - expense
        monthlyIncome: monthlyIncome,
        monthlyExpense: monthlyExpense,
        recentTransactions,
        activeBudgets: budgetsWithProgress
      }
    });
  } catch (error) {
    console.error('Dashboard controller error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get spending overview by category
exports.getSpendingOverview = async (req, res) => {
  try {
    // Get start and end date from query params or use current month
    let startDate, endDate;
    
    if (req.query.start_date && req.query.end_date) {
      startDate = new Date(req.query.start_date);
      endDate = new Date(req.query.end_date);
    } else {
      const currentDate = new Date();
      startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    }
    
    // Jika ingin menampilkan data harian (7 hari terakhir)
    if (req.query.period === 'weekly' || !req.query.period) {
      // Default ke period weekly jika tidak disebutkan
      const today = new Date();
      // Set tanggal mulai 7 hari yang lalu
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 6); // 7 hari termasuk hari ini

      // Array untuk menyimpan data harian
      const dailySpending = [];
      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

      // Loop untuk 7 hari
      for (let i = 0; i < 7; i++) {
        const day = new Date(weekAgo);
        day.setDate(weekAgo.getDate() + i);
        
        // Set waktu ke awal hari dan akhir hari untuk query yang akurat
        const dayStart = new Date(day.setHours(0, 0, 0, 0));
        const dayEnd = new Date(day.setHours(23, 59, 59, 999));

        // Query transaksi untuk hari ini
        const dayTransactions = await Transaction.findAll({
          where: { 
            user_id: req.user.id,
            transaction_type: 'expense',
            transaction_date: {
              [Op.between]: [dayStart, dayEnd]
            }
          },
          attributes: [
            [sequelize.fn('SUM', sequelize.col('amount')), 'total']
          ],
          raw: true
        });

        // Format hari Indonesia
        const dayName = dayNames[day.getDay()];
        
        // Tambahkan ke array
        dailySpending.push({
          day: dayName,
          date: day.toISOString().split('T')[0], // Format YYYY-MM-DD
          amount: parseFloat(dayTransactions[0].total || 0)
        });
      }

      // Ubah format response untuk frontend
      return res.json({ data: dailySpending });
    }
    
    // Format lama: Spending berdasarkan kategori (tetap dipertahankan)
    // Get expense transactions grouped by category
    const spendingByCategory = await Transaction.findAll({
      where: { 
        user_id: req.user.id,
        transaction_type: 'expense',
        transaction_date: {
          [Op.between]: [startDate, endDate]
        }
      },
      include: [{ model: Category, attributes: ['name', 'type', 'color', 'icon'] }],
      attributes: [
        'category_id',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      group: ['category_id', 'Category.id'],
      raw: true,
      nest: true
    });
    
    // Calculate total spending
    const totalSpending = spendingByCategory.reduce((sum, item) => sum + parseFloat(item.total), 0);
    
    // Add percentage to each category
    const spendingOverview = spendingByCategory.map(item => ({
      category: item.Category,
      amount: parseFloat(item.total),
      percentage: totalSpending > 0 ? (parseFloat(item.total) / totalSpending) * 100 : 0
    }));
    
    // Ubah format untuk menampilkan data kategori jika diminta
    if (req.query.format === 'by_category') {
      return res.json({ 
        data: {
          totalSpending,
          categories: spendingOverview
        }
      });
    }
    
    // Jika tidak ada parameter, gunakan daily sebagai default
    return res.json({ data: dailySpending });
  } catch (error) {
    console.error('Error in getSpendingOverview:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get monthly summary (income vs expense)
exports.getMonthlySummary = async (req, res) => {
  try {
    // Get year from query params or use current year
    const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
    
    // Initialize monthly data
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      income: 0,
      expense: 0
    }));
    
    // Get all transactions for the year
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    const transactions = await Transaction.findAll({
      where: { 
        user_id: req.user.id,
        transaction_date: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        [sequelize.fn('MONTH', sequelize.col('transaction_date')), 'month'],
        'transaction_type',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      group: [sequelize.fn('MONTH', sequelize.col('transaction_date')), 'transaction_type'],
      raw: true
    });
    
    // Populate monthly data
    transactions.forEach(transaction => {
      const monthIndex = parseInt(transaction.month) - 1;
      if (transaction.transaction_type === 'income') {
        months[monthIndex].income = parseFloat(transaction.total);
      } else if (transaction.transaction_type === 'expense') {
        months[monthIndex].expense = parseFloat(transaction.total);
      }
    });
    
    // Add net (income - expense) and savings rate
    const monthlySummary = months.map(month => ({
      ...month,
      net: month.income - month.expense,
      savingsRate: month.income > 0 ? ((month.income - month.expense) / month.income) * 100 : 0
    }));
    
    res.json({ 
      data: {
        year,
        months: monthlySummary
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get financial statistics
exports.getFinancialStats = async (req, res) => {
  try {
    // Get total assets (sum of all account balances)
    const accounts = await Account.findAll({
      where: { user_id: req.user.id },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('balance')), 'totalAssets']
      ],
      raw: true
    });
    
    // Get total income and expense for all time
    const incomeTotal = await Transaction.findAll({
      where: { 
        user_id: req.user.id,
        transaction_type: 'income'
      },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      raw: true
    });
    
    const expenseTotal = await Transaction.findAll({
      where: { 
        user_id: req.user.id,
        transaction_type: 'expense'
      },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      raw: true
    });
    
    // Get top expense categories
    const topExpenseCategories = await Transaction.findAll({
      where: { 
        user_id: req.user.id,
        transaction_type: 'expense'
      },
      include: [{ model: Category, attributes: ['name', 'type', 'color', 'icon'] }],
      attributes: [
        'category_id',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      group: ['category_id', 'Category.id'],
      order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']],
      limit: 5,
      raw: true,
      nest: true
    });
    
    // Get top income categories
    const topIncomeCategories = await Transaction.findAll({
      where: { 
        user_id: req.user.id,
        transaction_type: 'income'
      },
      include: [{ model: Category, attributes: ['name', 'type', 'color', 'icon'] }],
      attributes: [
        'category_id',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      group: ['category_id', 'Category.id'],
      order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']],
      limit: 5,
      raw: true,
      nest: true
    });
    
    // Calculate lifetime savings and savings rate
    const totalIncome = incomeTotal[0].total || 0;
    const totalExpense = expenseTotal[0].total || 0;
    const lifetimeSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (lifetimeSavings / totalIncome) * 100 : 0;
    
    res.json({ 
      data: {
        totalAssets: accounts[0].totalAssets || 0,
        totalIncome,
        totalExpense,
        lifetimeSavings,
        savingsRate,
        topExpenseCategories: topExpenseCategories.map(item => ({
          category: item.Category,
          amount: parseFloat(item.total)
        })),
        topIncomeCategories: topIncomeCategories.map(item => ({
          category: item.Category,
          amount: parseFloat(item.total)
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};