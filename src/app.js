require('./schedulers/budget.scheduler');

// Tambahkan route notifikasi
const notificationRoutes = require('./routes/notification.routes');
app.use('/api', notificationRoutes); 