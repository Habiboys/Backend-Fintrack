'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('transactions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'user',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      account_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'accounts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'categories',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      description: {
        type: Sequelize.STRING,
        allowNull: true
      },
      transaction_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      transaction_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Menambahkan index untuk performa
    await queryInterface.addIndex('transactions', ['user_id']);
    await queryInterface.addIndex('transactions', ['account_id']);
    await queryInterface.addIndex('transactions', ['category_id']);
    await queryInterface.addIndex('transactions', ['transaction_type']);
    await queryInterface.addIndex('transactions', ['transaction_date']);
    await queryInterface.addIndex('transactions', ['user_id', 'transaction_date']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('transactions');
  }
}; 