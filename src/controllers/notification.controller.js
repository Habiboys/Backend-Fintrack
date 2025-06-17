const notificationService = require('../services/notification.service');
const { User } = require('../models');

class NotificationController {
  async updateFcmToken(req, res) {
    try {
      const { fcm_token } = req.body;
      const userId = req.user.id; // Diasumsikan dari middleware auth

      if (!fcm_token) {
        console.log('FCM token tidak diberikan');
        return res.status(400).json({ message: 'FCM token is required' });
      }

      // Update FCM token menggunakan Sequelize
      const [updatedRows] = await User.update(
        { fcm_token },
        { where: { id: userId } }
      );

      if (updatedRows === 0) {
        console.log(`No user found with ID ${userId}`);
        return res.status(404).json({ message: 'User not found' });
      }

      console.log(`FCM token updated for user ${userId}`);
      res.json({ message: 'FCM token updated successfully' });
    } catch (error) {
      console.error('Error updating FCM token:', error);
      res.status(500).json({ 
        message: 'Internal server error',
        error: error.message 
      });
    }
  }

  // Contoh endpoint untuk mengirim notifikasi (untuk testing)
  async sendTestNotification(req, res) {
    try {
      const { userId, title, body, data } = req.body;

      if (!userId || !title || !body) {
        console.log('Missing required fields for test notification');
        return res.status(400).json({ 
          message: 'userId, title, and body are required' 
        });
      }

      const success = await notificationService.sendNotification(
        userId,
        title,
        body,
        data
      );

      if (success) {
        console.log(`Test notification sent to user ${userId}`);
        res.json({ message: 'Notification sent successfully' });
      } else {
        console.log(`Failed to send test notification to user ${userId}`);
        res.status(400).json({ message: 'Failed to send notification' });
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      res.status(500).json({ 
        message: 'Internal server error',
        error: error.message 
      });
    }
  }
}

module.exports = new NotificationController(); 