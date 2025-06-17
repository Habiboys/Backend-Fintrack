const admin = require('../config/firebase');
const { User } = require('../models');
const { Op } = require('sequelize');

class NotificationService {
  async sendNotification(userId, title, body, data = {}) {
    try {
      console.log('Attempting to send notification to user:', userId);
      console.log('Notification content:', { title, body, data });

      // Dapatkan FCM token dari database berdasarkan userId
      const user = await User.findByPk(userId);
      console.log('Found user:', user ? 'Yes' : 'No');
      console.log('User FCM token:', user?.fcm_token);
      
      if (!user || !user.fcm_token) {
        console.log(`No FCM token found for user ${userId}`);
        return false;
      }

      const message = {
        notification: {
          title,
          body,
        },
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        token: user.fcm_token,
      };

      console.log('Sending FCM message:', message);

      const response = await admin.messaging().send(message);
      console.log(`Successfully sent notification to user ${userId}:`, response);
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  async sendMulticastNotification(userIds, title, body, data = {}) {
    try {
      console.log('Attempting to send multicast notification to users:', userIds);
      // Dapatkan semua FCM token dari database
      const users = await User.findAll({
        where: {
          id: userIds,
          fcm_token: {
            [Op.ne]: null  // Hanya ambil user yang memiliki fcm_token
          }
        },
        attributes: ['fcm_token']
      });
      
      const tokens = users.map(user => user.fcm_token);
      console.log('Found FCM tokens:', tokens.length);
      
      if (!tokens.length) {
        console.log('No FCM tokens found for the specified users');
        return false;
      }

      const message = {
        notification: {
          title,
          body,
        },
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        tokens: tokens,
      };

      console.log('Sending multicast FCM message:', message);

      const response = await admin.messaging().sendMulticast(message);
      console.log('Multicast send response:', {
        success: response.successCount,
        failure: response.failureCount,
        responses: response.responses
      });
      return true;
    } catch (error) {
      console.error('Error sending multicast notification:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      return false;
    }
  }
}

module.exports = new NotificationService(); 