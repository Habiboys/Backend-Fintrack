-- Add FCM token column to users table
ALTER TABLE users
ADD COLUMN fcm_token VARCHAR(255) DEFAULT NULL; 