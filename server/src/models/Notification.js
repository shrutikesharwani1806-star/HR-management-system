const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  type: {
    type: String,
    enum: ['leave', 'attendance', 'approval', 'system', 'reminder', 'alert'],
    required: true,
  },
  channel: { type: String, enum: ['email', 'sms', 'push', 'in_app'], default: 'in_app' },
  isRead: { type: Boolean, default: false },
  readAt: Date,
  isCritical: { type: Boolean, default: false },
  metadata: Object,
  entityId: mongoose.Schema.Types.ObjectId,
  entityType: String,
  deliveryStatus: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'delivered'],
    default: 'pending',
  },
  deliveredAt: Date,
}, { timestamps: true });

notificationSchema.index({ tenantId: 1, userId: 1, isRead: 1 });
notificationSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
module.exports = mongoose.model('Notification', notificationSchema);
