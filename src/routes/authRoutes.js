// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Rute Registrasi
router.post('/register', authController.register);

// Rute Login
router.post('/login', authController.login);

// Contoh rute yang memerlukan autentikasi
router.get('/profile', authMiddleware, (req, res) => {
  res.json({ 
    user: req.user,
    message: 'Profil berhasil diakses' 
  });
});


module.exports = router;