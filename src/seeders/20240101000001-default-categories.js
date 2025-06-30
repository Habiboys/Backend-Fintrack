'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Karena ini adalah data default yang tidak terikat ke user spesifik,
    // kita akan membuat template categories yang bisa dipilih user
    const defaultCategories = [
      // Kategori Income
      {
        name: 'Gaji',
        type: 'income',
        color: '#4CAF50',
        icon: '💰',
        user_id: 1, // Temporary, akan diganti saat user daftar
        created_at: new Date()
      },
      {
        name: 'Bonus',
        type: 'income',
        color: '#8BC34A',
        icon: '🎁',
        user_id: 1,
        created_at: new Date()
      },
      {
        name: 'Investasi',
        type: 'income',
        color: '#CDDC39',
        icon: '📈',
        user_id: 1,
        created_at: new Date()
      },
      {
        name: 'Freelance',
        type: 'income',
        color: '#9C27B0',
        icon: '💻',
        user_id: 1,
        created_at: new Date()
      },

      // Kategori Expense
      {
        name: 'Makanan',
        type: 'expense',
        color: '#FF5722',
        icon: '🍔',
        user_id: 1,
        created_at: new Date()
      },
      {
        name: 'Transportasi',
        type: 'expense',
        color: '#2196F3',
        icon: '🚗',
        user_id: 1,
        created_at: new Date()
      },
      {
        name: 'Belanja',
        type: 'expense',
        color: '#E91E63',
        icon: '🛍️',
        user_id: 1,
        created_at: new Date()
      },
      {
        name: 'Hiburan',
        type: 'expense',
        color: '#FF9800',
        icon: '🎮',
        user_id: 1,
        created_at: new Date()
      },
      {
        name: 'Kesehatan',
        type: 'expense',
        color: '#009688',
        icon: '🏥',
        user_id: 1,
        created_at: new Date()
      },
      {
        name: 'Pendidikan',
        type: 'expense',
        color: '#3F51B5',
        icon: '📚',
        user_id: 1,
        created_at: new Date()
      },
      {
        name: 'Tagihan',
        type: 'expense',
        color: '#607D8B',
        icon: '💡',
        user_id: 1,
        created_at: new Date()
      },
      {
        name: 'Lainnya',
        type: 'expense',
        color: '#795548',
        icon: '📦',
        user_id: 1,
        created_at: new Date()
      }
    ];

    await queryInterface.bulkInsert('categories', defaultCategories, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('categories', null, {});
  }
}; 