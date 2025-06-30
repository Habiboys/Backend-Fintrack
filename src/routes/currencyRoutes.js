const express = require('express');
const router = express.Router();
const currencyController = require('../controllers/currencyController');
const authMiddleware = require('../middleware/authMiddleware');

// Semua routes memerlukan autentikasi
router.use(authMiddleware);

// GET /api/currency/supported - Mendapatkan daftar mata uang yang didukung
router.get('/supported', currencyController.getSupportedCurrencies);

// GET /api/currency/rate/:targetCurrency - Mendapatkan exchange rate IDR ke mata uang target
router.get('/rate/:targetCurrency', currencyController.getExchangeRate);

// POST /api/currency/convert - Melakukan konversi mata uang dan update saldo account
router.post('/convert', currencyController.convertCurrency);

// GET /api/currency/history - Mendapatkan history konversi (untuk fitur masa depan)
router.get('/history', currencyController.getConversionHistory);

module.exports = router; 