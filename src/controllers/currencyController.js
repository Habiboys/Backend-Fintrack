const { Account, Transaction, Category } = require('../models');
const axios = require('axios');

// Konfigurasi API untuk exchange rate
const EXCHANGE_API_KEY = process.env.EXCHANGE_API_KEY || 'demo_key';
const EXCHANGE_API_URL = 'https://v6.exchangerate-api.com/v6';

// Daftar mata uang yang didukung
const SUPPORTED_CURRENCIES = {
  'USD': 'US Dollar',
  'EUR': 'Euro',
  'JPY': 'Japanese Yen',
  'GBP': 'British Pound',
  'AUD': 'Australian Dollar',
  'CAD': 'Canadian Dollar',
  'CHF': 'Swiss Franc',
  'CNY': 'Chinese Yuan',
  'SGD': 'Singapore Dollar',
  'MYR': 'Malaysian Ringgit',
  'THB': 'Thai Baht',
  'KRW': 'South Korean Won',
};

// Mock exchange rates untuk development jika API key tidak tersedia
const MOCK_EXCHANGE_RATES = {
  'USD': 0.000065, // 1 IDR = 0.000065 USD
  'EUR': 0.000060,
  'JPY': 0.0095,
  'GBP': 0.000052,
  'AUD': 0.000098,
  'CAD': 0.000088,
  'CHF': 0.000058,
  'CNY': 0.00047,
  'SGD': 0.000087,
  'MYR': 0.00030,
  'THB': 0.0023,
  'KRW': 0.085,
};

// Get supported currencies
exports.getSupportedCurrencies = async (req, res) => {
  try {
    const currencies = Object.entries(SUPPORTED_CURRENCIES).map(([code, name]) => ({
      code,
      name
    }));
    
    res.json({
      success: true,
      data: currencies
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get exchange rate from IDR to target currency
exports.getExchangeRate = async (req, res) => {
  try {
    const { targetCurrency } = req.params;
    
    if (!SUPPORTED_CURRENCIES[targetCurrency]) {
      return res.status(400).json({
        success: false,
        message: `Mata uang ${targetCurrency} tidak didukung`
      });
    }

    let exchangeRate;

    // Coba menggunakan API real jika tersedia
    if (EXCHANGE_API_KEY !== 'demo_key') {
      try {
        const response = await axios.get(`${EXCHANGE_API_URL}/${EXCHANGE_API_KEY}/pair/IDR/${targetCurrency}`);
        
        if (response.data.result === 'success') {
          exchangeRate = response.data.conversion_rate;
        } else {
          throw new Error('API response error');
        }
      } catch (apiError) {
        console.log('API Error, using mock rate:', apiError.message);
        exchangeRate = MOCK_EXCHANGE_RATES[targetCurrency];
      }
    } else {
      // Gunakan mock rate untuk development
      exchangeRate = MOCK_EXCHANGE_RATES[targetCurrency];
    }

    if (!exchangeRate) {
      return res.status(400).json({
        success: false,
        message: `Tidak dapat mendapatkan kurs untuk ${targetCurrency}`
      });
    }

    res.json({
      success: true,
      data: {
        from: 'IDR',
        to: targetCurrency,
        rate: exchangeRate,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Convert currency and update account balance
exports.convertCurrency = async (req, res) => {
  try {
    const { accountId, amountInIDR, targetCurrency } = req.body;

    // Validasi input
    if (!accountId || !amountInIDR || !targetCurrency) {
      return res.status(400).json({
        success: false,
        message: 'Data tidak lengkap. Diperlukan accountId, amountInIDR, dan targetCurrency'
      });
    }

    if (amountInIDR <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Jumlah konversi harus lebih dari 0'
      });
    }

    if (!SUPPORTED_CURRENCIES[targetCurrency]) {
      return res.status(400).json({
        success: false,
        message: `Mata uang ${targetCurrency} tidak didukung`
      });
    }

    // Cek apakah account ada dan milik user
    const account = await Account.findOne({
      where: {
        id: accountId,
        user_id: req.user.id
      }
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Akun tidak ditemukan'
      });
    }

    // Konversi balance ke number jika string
    const currentBalance = parseFloat(account.balance) || 0;

    // Cek apakah saldo mencukupi
    if (currentBalance < amountInIDR) {
      return res.status(400).json({
        success: false,
        message: 'Saldo tidak mencukupi untuk konversi'
      });
    }

    // Dapatkan exchange rate
    let exchangeRate;
    if (EXCHANGE_API_KEY !== 'demo_key') {
      try {
        const response = await axios.get(`${EXCHANGE_API_URL}/${EXCHANGE_API_KEY}/pair/IDR/${targetCurrency}`);
        
        if (response.data.result === 'success') {
          exchangeRate = response.data.conversion_rate;
        } else {
          throw new Error('API response error');
        }
      } catch (apiError) {
        console.log('API Error, using mock rate:', apiError.message);
        exchangeRate = MOCK_EXCHANGE_RATES[targetCurrency];
      }
    } else {
      exchangeRate = MOCK_EXCHANGE_RATES[targetCurrency];
    }

    if (!exchangeRate) {
      return res.status(500).json({
        success: false,
        message: `Tidak dapat mendapatkan kurs untuk ${targetCurrency}`
      });
    }

    // Hitung jumlah mata uang target
    const convertedAmount = amountInIDR * exchangeRate;

    // Update saldo account
    const newBalance = currentBalance - amountInIDR;
    await Account.update(
      { balance: newBalance },
      {
        where: {
          id: accountId,
          user_id: req.user.id
        }
      }
    );

    // Cari atau buat kategori "Currency Conversion"
    let conversionCategory = await Category.findOne({
      where: { 
        name: 'Currency Conversion',
        user_id: req.user.id 
      }
    });

    if (!conversionCategory) {
      conversionCategory = await Category.create({
        user_id: req.user.id,
        name: 'Currency Conversion',
        type: 'expense', // Konversi mata uang adalah pengeluaran
        icon: 'currency_exchange',
        color: '#2196F3'
      });
    }

    // Simpan konversi sebagai transaksi
    const conversionTransaction = await Transaction.create({
      user_id: req.user.id,
      account_id: accountId,
      category_id: conversionCategory.id,
      amount: amountInIDR,
      description: `Konversi ${new Intl.NumberFormat('id-ID').format(amountInIDR)} IDR ke ${convertedAmount.toFixed(6)} ${targetCurrency} (Rate: ${exchangeRate})`,
      transaction_date: new Date(),
      transaction_type: 'EXPENSE'
    });

    console.log(`Currency conversion saved as transaction: ${conversionTransaction.id}`);

    // Response sukses
    res.json({
      success: true,
      message: 'Konversi mata uang berhasil',
      data: {
        originalAmount: amountInIDR,
        convertedAmount: convertedAmount,
        targetCurrency: targetCurrency,
        exchangeRate: exchangeRate,
        newBalance: newBalance,
        accountName: account.name,
        transactionDate: new Date().toISOString(),
        transactionId: conversionTransaction.id,
        categoryName: conversionCategory.name
      }
    });

  } catch (error) {
    console.error('Currency conversion error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get conversion history (jika diperlukan untuk fitur masa depan)
exports.getConversionHistory = async (req, res) => {
  try {
    // Placeholder untuk fitur masa depan
    // Bisa diimplementasikan dengan tabel currency_conversions
    res.json({
      success: true,
      message: 'Fitur history konversi akan segera tersedia',
      data: []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
}; 