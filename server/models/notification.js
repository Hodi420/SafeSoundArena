const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  type: { type: String, required: true, enum: ['info', 'warning', 'alert'] },
  message: { type: String, required: true, maxlength: 500 },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('Notification', NotificationSchema);
