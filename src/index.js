const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');
const authRoutes = require('./routes/authRoutes');
require('dotenv').config();

const app = express();

// Middleware CORS - mengizinkan semua origin
app.use(cors({
  origin: '*', // Mengizinkan semua origin - tidak disarankan untuk production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Midd
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Koneksi Database
const PORT = process.env.PORT || 3000;
sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
  });
});

module.exports = app;