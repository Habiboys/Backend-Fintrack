const cron = require('node-cron');
const budgetService = require('../services/budget.service');
const logger = require('../utils/logger');

// Jalankan pengecekan anggaran setiap 6 jam
cron.schedule('0 */6 * * *', async () => {
  logger.info('Running budget limits check scheduler');
  await budgetService.checkBudgetLimits();
}); 