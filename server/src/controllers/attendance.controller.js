const AttendanceRecord = require('../models/AttendanceRecord');
const Shift = require('../models/Shift');
const Employee = require('../models/Employee');
const Location = require('../models/Location');
const Approval = require('../models/Approval');
const { notifyMissedPunch } = require('../services/notification.service');

// Haversine distance (meters)
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Punch In/Out ─────────────────────────────────────────────────────────
exports.punch = async (req, res) => {
  const tenantId = req.tenantId;
  const { type, latitude, longitude, source = 'web' } = req.body;

  const employee = await Employee.findOne({ userId: req.user.id, tenantId }).populate('locationId').populate('shiftId');
  if (!employee) return res.status(404).json({ success: false, message: 'Employee profile not found' });

  // Validate geofence if location configured
  if (employee.locationId && employee.locationId.latitude !== undefined && employee.locationId.latitude !== null) {
    if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
      return res.status(400).json({ 
        success: false, 
        message: 'This organization requires GPS coordinates to punch in/out. Please enable location services on your device.' 
      });
    }
    const dist = haversine(latitude, longitude, employee.locationId.latitude, employee.locationId.longitude);
    const radius = employee.locationId.geofenceRadius || 100;
    if (dist > radius) {
      return res.status(403).json({ 
        success: false, 
        message: `Outside allowed office zone. You are ${Math.round(dist)}m away. Allowed radius is ${radius}m.` 
      });
    }
  }

  // Validate IP
  const clientIp = req.ip;
  if (employee.locationId?.allowedIps?.length > 0) {
    if (!employee.locationId.allowedIps.includes(clientIp)) {
      return res.status(403).json({ success: false, message: 'Punch not allowed from this IP address' });
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let record = await AttendanceRecord.findOne({ tenantId, employeeId: employee._id, date: today });
  if (!record) {
    record = await AttendanceRecord.create({ tenantId, employeeId: employee._id, date: today, shiftId: employee.shiftId?._id });
  }

  // Enforce only one punch-in per day
  if (type === 'in') {
    const hasPunchIn = record.punches.some((p) => p.type === 'in');
    if (hasPunchIn) {
      return res.status(400).json({ success: false, message: 'You have already punched in for today.' });
    }
  }

  // Add punch
  const punch = { time: new Date(), type, source, latitude, longitude, ipAddress: clientIp, isValid: true };
  record.punches.push(punch);

  // Recalculate worked time
  const ins = record.punches.filter((p) => p.type === 'in');
  const outs = record.punches.filter((p) => p.type === 'out');
  if (ins.length > 0) record.firstIn = ins[0].time;
  if (outs.length > 0) record.lastOut = outs[outs.length - 1].time;

  if (record.firstIn && record.lastOut) {
    record.workedMinutes = Math.round((record.lastOut - record.firstIn) / 60000);
  }

  // Calculate status using shift rules
  const shift = employee.shiftId;
  if (shift && record.firstIn) {
    const shiftStart = new Date(record.firstIn);
    const [sh, sm] = (shift.startTime || '09:00').split(':').map(Number);
    shiftStart.setHours(sh, sm, 0, 0);
    record.lateByMinutes = Math.max(0, Math.round((record.firstIn - shiftStart) / 60000) - (shift.gracePeriodMinutes || 0));

    if (record.workedMinutes >= (shift.fullDayMinutes || 480)) record.status = record.lateByMinutes > (shift.lateMarkAfterMinutes || 30) ? 'late' : 'present';
    else if (record.workedMinutes >= (shift.halfDayThresholdMinutes || 240)) record.status = 'half_day';
    else record.status = record.firstIn ? 'present' : 'absent';

    if (shift.overtimeEnabled && record.workedMinutes > (shift.fullDayMinutes || 480)) {
      record.overtimeMinutes = record.workedMinutes - (shift.fullDayMinutes || 480);
    }
  } else {
    record.status = 'present';
  }

  await record.save();
  res.json({ success: true, data: record });
};

// ─── My Attendance ────────────────────────────────────────────────────────
exports.myAttendance = async (req, res) => {
  const tenantId = req.tenantId;
  const employee = await Employee.findOne({ userId: req.user.id, tenantId });
  if (!employee) return res.status(404).json({ success: false, message: 'Profile not found' });

  const { month, year } = req.query;
  const now = new Date();
  const m = parseInt(month) || now.getMonth() + 1;
  const y = parseInt(year) || now.getFullYear();
  const from = new Date(y, m - 1, 1);
  const to = new Date(y, m, 0, 23, 59, 59);

  const records = await AttendanceRecord.find({ tenantId, employeeId: employee._id, date: { $gte: from, $lte: to } }).sort('date').lean();
  res.json({ success: true, data: records });
};

// ─── Team Attendance (Manager) ─────────────────────────────────────────────
exports.teamAttendance = async (req, res) => {
  const tenantId = req.tenantId;
  const manager = await Employee.findOne({ userId: req.user.id, tenantId });
  const { date } = req.query;
  const targetDate = date ? new Date(date) : new Date();
  targetDate.setHours(0, 0, 0, 0);

  const team = await Employee.find({ tenantId, managerId: manager?._id, status: 'active' }).select('_id firstName lastName employeeId photoUrl').lean();
  const empIds = team.map((e) => e._id);

  const records = await AttendanceRecord.find({ tenantId, employeeId: { $in: empIds }, date: targetDate }).lean();
  const map = {};
  records.forEach((r) => { map[r.employeeId.toString()] = r; });

  const result = team.map((e) => ({ ...e, attendance: map[e._id.toString()] || { status: 'absent' } }));
  res.json({ success: true, data: result });
};

// ─── Regularize Attendance ────────────────────────────────────────────────
exports.regularize = async (req, res) => {
  const tenantId = req.tenantId;
  const { recordId, reason, inTime, outTime } = req.body;

  const record = await AttendanceRecord.findOne({ _id: recordId, tenantId });
  if (!record) return res.status(404).json({ success: false, message: 'Attendance record not found' });

  const employee = await Employee.findById(record.employeeId);
  const approval = await Approval.create({
    tenantId,
    entityType: 'attendance_regularization',
    entityId: record._id,
    requestedBy: employee._id,
    status: 'pending',
    currentLevel: 1,
    totalLevels: 1,
    stages: [{ level: 1, approverId: employee.managerId, approverRole: 'manager', status: 'pending', slaDeadline: new Date(Date.now() + 48 * 3600000) }],
    metadata: { reason, inTime, outTime },
  });

  record.isRegularized = true;
  record.regularizationReason = reason;
  record.regularizationStatus = 'pending';
  record.regularizationApprovalId = approval._id;
  await record.save();

  res.json({ success: true, message: 'Regularization request submitted', data: approval });
};

// ─── HR: All Attendance ───────────────────────────────────────────────────
exports.allAttendance = async (req, res) => {
  const tenantId = req.tenantId;
  const { date, department, location, status } = req.query;
  const targetDate = date ? new Date(date) : new Date();
  targetDate.setHours(0, 0, 0, 0);

  const empQuery = { tenantId, status: 'active' };
  if (department) empQuery.departmentId = department;
  if (location) empQuery.locationId = location;

  const employees = await Employee.find(empQuery)
    .populate('departmentId', 'name')
    .populate('designationId', 'name')
    .populate('locationId', 'name')
    .lean();

  const empIds = employees.map((e) => e._id);

  const records = await AttendanceRecord.find({ tenantId, employeeId: { $in: empIds }, date: targetDate }).lean();
  const map = {};
  records.forEach((r) => { map[r.employeeId.toString()] = r; });

  let result = employees.map((e) => ({
    ...e,
    attendance: map[e._id.toString()] || { status: 'absent' }
  }));

  if (status) {
    result = result.filter(r => (r.attendance?.status || 'absent') === status);
  }

  res.json({ success: true, data: result });
};

// ─── Shift CRUD ────────────────────────────────────────────────────────────
exports.createShift = async (req, res) => {
  const shift = await Shift.create({ ...req.body, tenantId: req.tenantId });
  res.status(201).json({ success: true, data: shift });
};

exports.listShifts = async (req, res) => {
  const shifts = await Shift.find({ tenantId: req.tenantId, isActive: true });
  res.json({ success: true, data: shifts });
};

exports.correctAttendance = async (req, res) => {
  const tenantId = req.tenantId;
  const { id } = req.params;
  const { employeeId, date, firstIn, lastOut, status, workedMinutes, remarks } = req.body;

  let record;
  if (id === 'new') {
    const recordDate = date ? new Date(date) : new Date();
    recordDate.setHours(0, 0, 0, 0);
    record = await AttendanceRecord.findOne({ tenantId, employeeId, date: recordDate });
    if (!record) {
      record = new AttendanceRecord({ tenantId, employeeId, date: recordDate });
    }
  } else {
    record = await AttendanceRecord.findOne({ _id: id, tenantId });
  }

  if (!record) return res.status(404).json({ success: false, message: 'Attendance record not found' });

  const baseDateStr = new Date(record.date).toISOString().split('T')[0];
  if (firstIn !== undefined) record.firstIn = firstIn ? new Date(`${baseDateStr}T${firstIn}:00`) : null;
  if (lastOut !== undefined) record.lastOut = lastOut ? new Date(`${baseDateStr}T${lastOut}:00`) : null;
  if (status !== undefined) record.status = status;
  if (workedMinutes !== undefined) record.workedMinutes = workedMinutes;
  else if (record.firstIn && record.lastOut) {
    record.workedMinutes = Math.round((record.lastOut - record.firstIn) / 60000);
  }
  if (remarks !== undefined) record.remarks = remarks;

  record.isRegularized = true;
  record.regularizationStatus = 'approved';
  record.regularizationReason = 'Direct HR correction';

  await record.save();
  res.json({ success: true, message: 'Attendance record updated by HR', data: record });
};
