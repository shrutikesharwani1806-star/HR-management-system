const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g. "employee:create"
  module: { type: String, required: true }, // e.g. "employee"
  action: { type: String, required: true }, // e.g. "create"
}, { timestamps: true });

module.exports = mongoose.model('Permission', permissionSchema);
