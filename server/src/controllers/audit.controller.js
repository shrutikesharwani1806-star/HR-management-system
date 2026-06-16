const AuditLog = require('../models/AuditLog');

exports.list = async (req, res) => {
  const { page = 1, limit = 50, module, userId, startDate, endDate } = req.query;
  const query = { tenantId: req.tenantId };
  if (module) query.module = module;
  if (userId) query.userId = userId;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [data, total] = await Promise.all([
    AuditLog.find(query).sort('-createdAt').skip(skip).limit(parseInt(limit)).lean(),
    AuditLog.countDocuments(query),
  ]);
  res.json({ success: true, data, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
};
