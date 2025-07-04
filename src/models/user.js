// models/user.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // Definisi relasi
      User.hasMany(models.Account, { foreignKey: 'user_id' });
      User.hasMany(models.Category, { foreignKey: 'user_id' });
      User.hasMany(models.Transaction, { foreignKey: 'user_id' });
      User.hasMany(models.Budget, { foreignKey: 'user_id' });
    }
  }

  User.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fullname: {
      type: DataTypes.STRING,
      allowNull: false
    },
    saldo: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    fcm_token: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'user',
    // hooks: {
    //   beforeCreate: async (user) => {
    //     const salt = await bcrypt.genSalt(10);
    //     user.password = await bcrypt.hash(user.password, salt);
    //   }
    // }
  });

  return User;
};