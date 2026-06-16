const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  preferences: {
    // Map event keys: e.g. 'leave_applied', 'leave_approved', 'leave_rejected', 'missed_punch', 'attendance_regularization', 'approval_reminders'
    type: Map,
    of: {
      in_app: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    },
    default: {}
  }
}, { timestamps: true });

notificationPreferenceSchema.index({ tenantId: 1, employeeId: 1 }, { unique: true });
module.exports = mongoose.model('NotificationPreference', notificationPreferenceSchema);
