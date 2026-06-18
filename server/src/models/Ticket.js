const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  message: { type: String, required: true },
  attachments: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

const ticketSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  ticketId: { type: String, required: true, unique: true },
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, enum: ['HR', 'IT', 'Payroll', 'Other'], default: 'HR' },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
  status: { type: String, enum: ['Open', 'In Progress', 'Resolved', 'Closed'], default: 'Open' },
  messages: [messageSchema],
  slaDueDate: { type: Date }
}, { timestamps: true });

ticketSchema.index({ tenantId: 1, ticketId: 1 }, { unique: true });

module.exports = mongoose.model('Ticket', ticketSchema);
