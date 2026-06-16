const Notification = require('../models/Notification');

exports.list = async (req, res) => {
  const { page = 1, limit = 20, isRead } = req.query;
  const query = { tenantId: req.tenantId, userId: req.user.id };
  if (isRead !== undefined) query.isRead = isRead === 'true';
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [notifications, total, unread] = await Promise.all([
    Notification.find(query).sort('-createdAt').skip(skip).limit(parseInt(limit)).lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ tenantId: req.tenantId, userId: req.user.id, isRead: false }),
  ]);
  res.json({ success: true, data: notifications, unreadCount: unread, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
};

exports.markRead = async (req, res) => {
  await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user.id, tenantId: req.tenantId }, { isRead: true, readAt: new Date() });
  res.json({ success: true, message: 'Marked as read' });
};

exports.markAllRead = async (req, res) => {
  await Notification.updateMany({ userId: req.user.id, tenantId: req.tenantId, isRead: false }, { isRead: true, readAt: new Date() });
  res.json({ success: true, message: 'All notifications marked as read' });
};
