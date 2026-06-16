const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');
const LeaveType = require('../models/LeaveType');
const Holiday = require('../models/Holiday');
const Employee = require('../models/Employee');
const Approval = require('../models/Approval');
const AttendanceRecord = require('../models/AttendanceRecord');

function countWorkingDays(from, to, holidayDates) {
  let days = 0;
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6 && !holidayDates.has(d.toDateString())) days++;
  }
  return days;
}

exports.apply = async (req, res) => {
  const tenantId = req.tenantId;
  const { leaveTypeId, fromDate, toDate, reason, dayType = 'full_day', attachmentUrl } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ success: false, message: 'Reason for leave is required.' });
  }
  const employee = await Employee.findOne({ userId: req.user.id, tenantId });
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
  let typeId = leaveTypeId;
  const customTypes = {
    'emergency': { name: 'Emergency Leave', category: 'custom' },
    'family_emergency': { name: 'Family Emergency Leave', category: 'custom' },
    'medical_emergency': { name: 'Medical Emergency Leave', category: 'sick' },
    'casual': { name: 'Casual Leave', category: 'casual' },
    'sick': { name: 'Sick Leave', category: 'sick' },
    'earned': { name: 'Earned Leave', category: 'earned' },
    'comp_off': { name: 'Comp-Off', category: 'comp_off' },
    'wfh': { name: 'Work From Home', category: 'custom' },
    'maternity': { name: 'Maternity Leave', category: 'maternity' },
    'paternity': { name: 'Paternity Leave', category: 'paternity' },
    'marriage': { name: 'Marriage Leave', category: 'custom' },
    'bereavement': { name: 'Bereavement Leave', category: 'bereavement' },
    'optional_holiday': { name: 'Optional Holiday', category: 'custom' },
    'lwp': { name: 'Leave Without Pay', category: 'loss_of_pay' },
    'fever': { name: 'Fever', category: 'sick' },
    'health': { name: 'Health Issue', category: 'sick' },
    'other': { name: 'Other Issue', category: 'custom' }
  };

  if (customTypes[typeId]) {
    const codeName = typeId.toUpperCase();
    let customType = await LeaveType.findOne({ tenantId, code: codeName });
    if (!customType) {
      customType = await LeaveType.create({
        tenantId,
        name: customTypes[typeId].name,
        code: codeName,
        category: customTypes[typeId].category,
        isPaid: false, // Defaulting to unpaid pending approval
        requiresApproval: true,
      });
    }
    typeId = customType._id;
  }

  const leaveType = await LeaveType.findOne({ _id: typeId, tenantId, isActive: true });
  if (!leaveType) return res.status(404).json({ success: false, message: 'Leave type not found' });
  const from = new Date(fromDate), to = new Date(toDate);
  const holidays = await Holiday.find({ tenantId, date: { $gte: from, $lte: to }, isActive: true });
  const holidayDates = new Set(holidays.map((h) => h.date.toDateString()));
  let totalDays = dayType !== 'full_day' ? 0.5 : countWorkingDays(from, to, holidayDates);
  if (totalDays <= 0) return res.status(400).json({ success: false, message: 'No working days in selected range' });
  const overlap = await LeaveRequest.findOne({ tenantId, employeeId: employee._id, status: { $in: ['pending', 'approved'] }, fromDate: { $lte: to }, toDate: { $gte: from } });
  if (overlap) return res.status(409).json({ success: false, message: 'Overlapping leave request exists' });
  const year = from.getFullYear();
  const balance = await LeaveBalance.findOne({ tenantId, employeeId: employee._id, leaveTypeId: typeId, year });
  const available = balance ? Math.max(0, balance.allocated + balance.accrued + balance.carried - balance.used - balance.pending) : 0;
  if (leaveType.isPaid && available < totalDays) return res.status(400).json({ success: false, message: `Insufficient leave balance. Available: ${available}` });
  if (leaveType.maxConsecutiveDays > 0 && totalDays > leaveType.maxConsecutiveDays) return res.status(400).json({ success: false, message: `Max ${leaveType.maxConsecutiveDays} consecutive days allowed` });
  // Leave requires HR approval when configured
  const leave = await LeaveRequest.create({ tenantId, employeeId: employee._id, leaveTypeId: typeId, fromDate: from, toDate: to, totalDays, dayType, reason, attachmentUrl, status: leaveType.requiresApproval ? 'pending' : 'approved' });
  if (balance) await LeaveBalance.findByIdAndUpdate(balance._id, { $inc: leaveType.requiresApproval ? { pending: totalDays } : { used: totalDays } });
  if (leaveType.requiresApproval) {
    // Trigger Notification only (no approval engine needed for demo)
    if (employee.managerId) {
      const { triggerNotification } = require('../services/notification.service');
      await triggerNotification(tenantId, employee.managerId, 'leave_applied', {
        employeeName: `${employee.firstName} ${employee.lastName}`,
        leaveType: leaveType.name,
        fromDate: from.toLocaleDateString(),
        toDate: to.toLocaleDateString()
      }).catch(err => console.error('Notification error:', err));
    }
  }
  res.status(201).json({ success: true, data: leave });
};

exports.myRequests = async (req, res) => {
  const employee = await Employee.findOne({ userId: req.user.id, tenantId: req.tenantId });
  if (!employee) return res.status(404).json({ success: false, message: 'Profile not found' });
  const requests = await LeaveRequest.find({ tenantId: req.tenantId, employeeId: employee._id }).populate('leaveTypeId', 'name category isPaid').sort('-createdAt').lean();
  res.json({ success: true, data: requests });
};

exports.myBalances = async (req, res) => {
  const employee = await Employee.findOne({ userId: req.user.id, tenantId: req.tenantId });
  if (!employee) return res.status(404).json({ success: false, message: 'Profile not found' });
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const balances = await LeaveBalance.find({ tenantId: req.tenantId, employeeId: employee._id, year }).populate('leaveTypeId', 'name category isPaid').lean();
  const result = balances.map((b) => ({ ...b, available: Math.max(0, b.allocated + b.accrued + b.carried - b.used - b.pending) }));
  res.json({ success: true, data: result });
};

exports.cancel = async (req, res) => {
  const employee = await Employee.findOne({ userId: req.user.id, tenantId: req.tenantId });
  const leave = await LeaveRequest.findOne({ _id: req.params.id, tenantId: req.tenantId, employeeId: employee._id });
  if (!leave) return res.status(404).json({ success: false, message: 'Not found' });
  if (!['pending', 'approved'].includes(leave.status)) return res.status(400).json({ success: false, message: 'Cannot cancel' });
  const prev = leave.status;
  leave.status = 'cancelled'; leave.cancelledAt = new Date(); await leave.save();
  if (prev === 'pending') await LeaveBalance.findOneAndUpdate({ tenantId: req.tenantId, employeeId: employee._id, leaveTypeId: leave.leaveTypeId, year: leave.fromDate.getFullYear() }, { $inc: { pending: -leave.totalDays } });
  else await LeaveBalance.findOneAndUpdate({ tenantId: req.tenantId, employeeId: employee._id, leaveTypeId: leave.leaveTypeId, year: leave.fromDate.getFullYear() }, { $inc: { used: -leave.totalDays } });
  res.json({ success: true, message: 'Leave cancelled' });
};

exports.resolve = async (req, res) => {
  const { id } = req.params;
  const { action, comment } = req.body;
  const tenantId = req.tenantId;
  const leave = await LeaveRequest.findOne({ _id: id, tenantId }).populate('leaveTypeId', 'name');
  if (!leave) return res.status(404).json({ success: false, message: 'Not found' });
  if (leave.status !== 'pending') return res.status(400).json({ success: false, message: 'Not pending' });
  const approver = await Employee.findOne({ userId: req.user.id, tenantId });
  if (action === 'approve') {
    leave.status = 'approved'; leave.approvedBy = `${approver?.firstName} ${approver?.lastName}`; leave.approvedAt = new Date(); await leave.save();
    await LeaveBalance.findOneAndUpdate({ tenantId, employeeId: leave.employeeId, leaveTypeId: leave.leaveTypeId, year: leave.fromDate.getFullYear() }, { $inc: { pending: -leave.totalDays, used: leave.totalDays } });
    for (let d = new Date(leave.fromDate); d <= leave.toDate; d.setDate(d.getDate() + 1)) {
      const date = new Date(d); date.setHours(0, 0, 0, 0);
      await AttendanceRecord.findOneAndUpdate({ tenantId, employeeId: leave.employeeId, date }, { status: 'on_leave' }, { upsert: true, setDefaultsOnInsert: true });
    }
  } else {
    leave.status = 'rejected'; leave.rejectedBy = `${approver?.firstName} ${approver?.lastName}`; leave.rejectedAt = new Date(); leave.rejectionReason = comment; await leave.save();
    await LeaveBalance.findOneAndUpdate({ tenantId, employeeId: leave.employeeId, leaveTypeId: leave.leaveTypeId, year: leave.fromDate.getFullYear() }, { $inc: { pending: -leave.totalDays } });
  }
  if (leave.approvalId) await Approval.findByIdAndUpdate(leave.approvalId, { status: action === 'approve' ? 'approved' : 'rejected', completedAt: new Date() });
  res.json({ success: true, data: leave });
};

exports.teamRequests = async (req, res) => {
  const tenantId = req.tenantId;
  const manager = await Employee.findOne({ userId: req.user.id, tenantId });
  const team = await Employee.find({ tenantId, managerId: manager?._id }).select('_id').lean();
  const { status } = req.query;
  const query = { tenantId, employeeId: { $in: team.map((e) => e._id) } };
  if (status) query.status = status;
  const requests = await LeaveRequest.find(query).populate('employeeId', 'firstName lastName employeeId').populate('leaveTypeId', 'name').sort('-createdAt').lean();
  res.json({ success: true, data: requests });
};

exports.allRequests = async (req, res) => {
  const tenantId = req.tenantId;
  const { status } = req.query;
  const query = { tenantId };
  if (status) query.status = status;
  const requests = await LeaveRequest.find(query)
    .populate('employeeId', 'firstName lastName employeeId')
    .populate('leaveTypeId', 'name')
    .sort('-createdAt')
    .lean();
  res.json({ success: true, data: requests });
};

exports.createLeaveType = async (req, res) => {
  const lt = await LeaveType.create({ ...req.body, tenantId: req.tenantId });
  res.status(201).json({ success: true, data: lt });
};
exports.listLeaveTypes = async (req, res) => {
  const types = await LeaveType.find({ tenantId: req.tenantId, isActive: true });
  res.json({ success: true, data: types });
};
exports.createHoliday = async (req, res) => {
  const h = await Holiday.create({ ...req.body, tenantId: req.tenantId });
  res.status(201).json({ success: true, data: h });
};
exports.listHolidays = async (req, res) => {
  const y = parseInt(req.query.year) || new Date().getFullYear();
  const holidays = await Holiday.find({ tenantId: req.tenantId, isActive: true, date: { $gte: new Date(y, 0, 1), $lte: new Date(y, 11, 31) } }).sort('date');
  res.json({ success: true, data: holidays });
};
