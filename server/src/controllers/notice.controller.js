const Notice = require('../models/Notice');
const { CustomError } = require('../middleware/error.middleware');

exports.createNotice = async (req, res) => {
  const { title, description, fromDate, toDate } = req.body;
  
  if (!['hr_admin', 'super_admin', 'leadership'].includes(req.user.role)) {
    throw new CustomError('Only HR and Leadership can create notices', 403);
  }

  if (!title || !description || !fromDate || !toDate) {
    throw new CustomError('Please provide all notice details', 400);
  }

  const notice = await Notice.create({
    tenantId: req.user.tenantId,
    title,
    description,
    fromDate,
    toDate,
    createdBy: req.user._id
  });

  res.status(201).json({
    success: true,
    data: notice
  });
};

exports.getActiveNotices = async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch notices that haven't expired yet
  const notices = await Notice.find({
    tenantId: req.user.tenantId,
    toDate: { $gte: today }
  }).sort({ createdAt: -1 }).populate({
    path: 'createdBy',
    select: 'email employeeId',
    populate: { path: 'employeeId', select: 'firstName lastName photoUrl' }
  });

  res.status(200).json({
    success: true,
    data: notices
  });
};
