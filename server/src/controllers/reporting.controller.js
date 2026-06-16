const Employee = require('../models/Employee');
const AttendanceRecord = require('../models/AttendanceRecord');
const LeaveRequest = require('../models/LeaveRequest');
const ExportJob = require('../models/ExportJob');
const fs = require('fs');
const path = require('path');

exports.dashboard = async (req, res) => {
  const tenantId = req.tenantId;
  const today = new Date(); today.setHours(0, 0, 0, 0);

  // Check if role is manager to scope data
  let queryScope = { tenantId };
  let attendanceScope = { tenantId, date: today };
  let leaveScope = { tenantId, status: 'pending' };

  if (req.user.role === 'manager') {
    const managerEmp = await Employee.findOne({ userId: req.user.id, tenantId });
    if (managerEmp) {
      const team = await Employee.find({ tenantId, managerId: managerEmp._id }).select('_id').lean();
      const teamIds = team.map(t => t._id);
      
      queryScope.managerId = managerEmp._id;
      attendanceScope.employeeId = { $in: teamIds };
      leaveScope.employeeId = { $in: teamIds };
    }
  }

  const [headcount, active, today_present, today_absent, today_late, pending_leaves] = await Promise.all([
    Employee.countDocuments(queryScope),
    Employee.countDocuments({ ...queryScope, status: 'active' }),
    AttendanceRecord.countDocuments({ ...attendanceScope, status: 'present' }),
    AttendanceRecord.countDocuments({ ...attendanceScope, status: 'absent' }),
    AttendanceRecord.countDocuments({ ...attendanceScope, status: 'late' }),
    LeaveRequest.countDocuments(leaveScope),
  ]);

  res.json({ success: true, data: { headcount, active, today_present, today_absent, today_late, pending_leaves } });
};

// ─── Headcount Report ───────────────────────────────────────────────────────
exports.headcount = async (req, res) => {
  const tenantId = req.tenantId;
  const { department, location } = req.query;
  const match = { tenantId };
  if (department) match.departmentId = department;
  if (location) match.locationId = location;

  if (req.user.role === 'manager') {
    const managerEmp = await Employee.findOne({ userId: req.user.id, tenantId });
    if (managerEmp) {
      match.managerId = managerEmp._id;
    }
  }

  const data = await Employee.aggregate([
    { $match: match },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  res.json({ success: true, data });
};

// ─── Attendance Summary Report ──────────────────────────────────────────────
exports.attendanceSummary = async (req, res) => {
  const tenantId = req.tenantId;
  const { startDate, endDate, department } = req.query;
  const from = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = endDate ? new Date(endDate) : new Date();
  
  const match = { tenantId, date: { $gte: from, $lte: to } };

  if (req.user.role === 'manager') {
    const managerEmp = await Employee.findOne({ userId: req.user.id, tenantId });
    if (managerEmp) {
      const team = await Employee.find({ tenantId, managerId: managerEmp._id }).select('_id').lean();
      match.employeeId = { $in: team.map(t => t._id) };
    }
  }

  const data = await AttendanceRecord.aggregate([
    { $match: match },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  res.json({ success: true, data });
};

// ─── Leave Summary Report ───────────────────────────────────────────────────
exports.leaveSummary = async (req, res) => {
  const tenantId = req.tenantId;
  const { year } = req.query;
  const y = parseInt(year) || new Date().getFullYear();
  
  const match = { tenantId, fromDate: { $gte: new Date(y, 0, 1) }, toDate: { $lte: new Date(y, 11, 31) } };

  if (req.user.role === 'manager') {
    const managerEmp = await Employee.findOne({ userId: req.user.id, tenantId });
    if (managerEmp) {
      const team = await Employee.find({ tenantId, managerId: managerEmp._id }).select('_id').lean();
      match.employeeId = { $in: team.map(t => t._id) };
    }
  }

  const data = await LeaveRequest.aggregate([
    { $match: match },
    { $group: { _id: '$status', total: { $sum: '$totalDays' }, count: { $sum: 1 } } },
  ]);
  res.json({ success: true, data });
};

// ─── Overtime Report ────────────────────────────────────────────────────────
exports.overtime = async (req, res) => {
  const tenantId = req.tenantId;
  const { startDate, endDate } = req.query;
  const from = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = endDate ? new Date(endDate) : new Date();

  // Assuming overtime is calculated where workedMinutes > 480 minutes (8 hours)
  const match = { tenantId, date: { $gte: from, $lte: to }, workedMinutes: { $gt: 480 } };

  if (req.user.role === 'manager') {
    const managerEmp = await Employee.findOne({ userId: req.user.id, tenantId });
    if (managerEmp) {
      const team = await Employee.find({ tenantId, managerId: managerEmp._id }).select('_id').lean();
      match.employeeId = { $in: team.map(t => t._id) };
    }
  }

  const records = await AttendanceRecord.find(match).populate('employeeId', 'firstName lastName employeeId').lean();
  const data = records.map(r => ({
    employeeName: r.employeeId ? `${r.employeeId.firstName} ${r.employeeId.lastName}` : 'Unknown',
    employeeId: r.employeeId?.employeeId || '—',
    date: r.date,
    workedMinutes: r.workedMinutes,
    overtimeMinutes: r.workedMinutes - 480
  }));

  res.json({ success: true, data });
};

// ─── Late Arrivals Report ───────────────────────────────────────────────────
exports.lateArrivals = async (req, res) => {
  const tenantId = req.tenantId;
  const { startDate, endDate } = req.query;
  const from = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = endDate ? new Date(endDate) : new Date();

  const match = { tenantId, date: { $gte: from, $lte: to }, status: 'late' };

  if (req.user.role === 'manager') {
    const managerEmp = await Employee.findOne({ userId: req.user.id, tenantId });
    if (managerEmp) {
      const team = await Employee.find({ tenantId, managerId: managerEmp._id }).select('_id').lean();
      match.employeeId = { $in: team.map(t => t._id) };
    }
  }

  const data = await AttendanceRecord.find(match).populate('employeeId', 'firstName lastName employeeId').lean();
  res.json({ success: true, data });
};

// ─── Absence Report ─────────────────────────────────────────────────────────
exports.absence = async (req, res) => {
  const tenantId = req.tenantId;
  const { startDate, endDate } = req.query;
  const from = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = endDate ? new Date(endDate) : new Date();

  const match = { tenantId, date: { $gte: from, $lte: to }, status: 'absent' };

  if (req.user.role === 'manager') {
    const managerEmp = await Employee.findOne({ userId: req.user.id, tenantId });
    if (managerEmp) {
      const team = await Employee.find({ tenantId, managerId: managerEmp._id }).select('_id').lean();
      match.employeeId = { $in: team.map(t => t._id) };
    }
  }

  const data = await AttendanceRecord.find(match).populate('employeeId', 'firstName lastName employeeId').lean();
  res.json({ success: true, data });
};

// ─── Attrition Report ───────────────────────────────────────────────────────
exports.attrition = async (req, res) => {
  const tenantId = req.tenantId;
  const { year } = req.query;
  const y = parseInt(year) || new Date().getFullYear();
  
  const match = { tenantId, status: { $in: ['terminated', 'resigned'] }, exitDate: { $gte: new Date(y, 0, 1), $lte: new Date(y, 11, 31) } };

  if (req.user.role === 'manager') {
    const managerEmp = await Employee.findOne({ userId: req.user.id, tenantId });
    if (managerEmp) {
      match.managerId = managerEmp._id;
    }
  }

  const data = await Employee.aggregate([
    { $match: match },
    { $group: { _id: { month: { $month: '$exitDate' } }, count: { $sum: 1 } } },
    { $sort: { '_id.month': 1 } },
  ]);
  res.json({ success: true, data });
};

// ─── Leadership Overview ────────────────────────────────────────────────────
exports.leadershipOverview = async (req, res) => {
  const tenantId = req.tenantId;
  const User = require('../models/User');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const thisYear = new Date().getFullYear();
  const thisMonth = new Date().getMonth();

  const [
    totalEmployees,
    totalManagers,
    totalHrUsers,
    totalLeadership,
    activeEmployees,
    newJoinersThisMonth,
    departmentDist,
    locationDist,
    statusDist,
    attendanceToday,
    pendingLeaves,
    approvedLeaves,
    rejectedLeaves,
    monthlyGrowth,
    departmentLeaveStats,
    recentJoiners,
  ] = await Promise.all([
    Employee.countDocuments({ tenantId }),
    User.countDocuments({ tenantId, role: 'manager', isActive: true }),
    User.countDocuments({ tenantId, role: 'hr_admin', isActive: true }),
    User.countDocuments({ tenantId, role: 'leadership', isActive: true }),
    Employee.countDocuments({ tenantId, status: 'active' }),
    Employee.countDocuments({
      tenantId,
      joiningDate: { $gte: new Date(thisYear, thisMonth, 1) }
    }),
    // Department distribution
    Employee.aggregate([
      { $match: { tenantId, status: { $in: ['active', 'probation'] } } },
      { $group: { _id: '$departmentId', count: { $sum: 1 } } },
      { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
      { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
      { $project: { name: { $ifNull: ['$dept.name', 'Unassigned'] }, count: 1 } },
      { $sort: { count: -1 } },
    ]),
    // Location distribution
    Employee.aggregate([
      { $match: { tenantId, status: { $in: ['active', 'probation'] } } },
      { $group: { _id: '$locationId', count: { $sum: 1 } } },
      { $lookup: { from: 'locations', localField: '_id', foreignField: '_id', as: 'loc' } },
      { $unwind: { path: '$loc', preserveNullAndEmptyArrays: true } },
      { $project: { name: { $ifNull: ['$loc.name', 'Unassigned'] }, city: '$loc.city', count: 1 } },
      { $sort: { count: -1 } },
    ]),
    // Status distribution
    Employee.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    // Attendance today
    AttendanceRecord.aggregate([
      { $match: { tenantId, date: today } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    // Leave stats
    LeaveRequest.countDocuments({ tenantId, status: 'pending' }),
    LeaveRequest.countDocuments({ tenantId, status: 'approved', fromDate: { $gte: new Date(thisYear, 0, 1) } }),
    LeaveRequest.countDocuments({ tenantId, status: 'rejected', fromDate: { $gte: new Date(thisYear, 0, 1) } }),
    // Monthly growth (employees joined per month this year)
    Employee.aggregate([
      { $match: { tenantId, joiningDate: { $gte: new Date(thisYear, 0, 1) } } },
      { $group: { _id: { month: { $month: '$joiningDate' } }, count: { $sum: 1 } } },
      { $sort: { '_id.month': 1 } },
    ]),
    // Department-wise leave stats
    LeaveRequest.aggregate([
      { $match: { tenantId, fromDate: { $gte: new Date(thisYear, 0, 1) } } },
      { $lookup: { from: 'employees', localField: 'employeeId', foreignField: '_id', as: 'emp' } },
      { $unwind: '$emp' },
      { $group: {
        _id: '$emp.departmentId',
        total: { $sum: '$totalDays' },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
      }},
      { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
      { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
      { $project: { name: { $ifNull: ['$dept.name', 'Unassigned'] }, total: 1, pending: 1, approved: 1, rejected: 1 } },
      { $sort: { total: -1 } },
    ]),
    // Recent joiners
    Employee.find({ tenantId, joiningDate: { $gte: new Date(thisYear, thisMonth, 1) } })
      .select('firstName lastName employeeId joiningDate departmentId designationId photoUrl')
      .populate('departmentId', 'name')
      .populate('designationId', 'name')
      .sort('-joiningDate')
      .limit(10)
      .lean(),
  ]);

  // Build attendance map
  const attendanceMap = {};
  attendanceToday.forEach(a => { attendanceMap[a._id] = a.count; });

  res.json({
    success: true,
    data: {
      company: {
        totalEmployees,
        totalManagers,
        totalHrUsers,
        totalLeadership,
        activeEmployees,
        newJoinersThisMonth,
      },
      attendance: {
        present: attendanceMap.present || 0,
        absent: attendanceMap.absent || 0,
        late: attendanceMap.late || 0,
        halfDay: attendanceMap.half_day || 0,
        onLeave: attendanceMap.on_leave || 0,
        rate: activeEmployees > 0
          ? Math.round(((attendanceMap.present || 0) / activeEmployees) * 100)
          : 0,
      },
      leave: {
        pending: pendingLeaves,
        approved: approvedLeaves,
        rejected: rejectedLeaves,
        departmentStats: departmentLeaveStats,
      },
      workforce: {
        departmentDistribution: departmentDist,
        locationDistribution: locationDist,
        statusDistribution: statusDist,
      },
      trends: {
        monthlyGrowth,
      },
      recentJoiners,
    },
  });
};

// ─── Trigger Asynchronous Report Export ─────────────────────────────────────
exports.triggerExport = async (req, res) => {
  const tenantId = req.tenantId;
  const { reportType, format, filters = {} } = req.body;

  if (!reportType || !format) {
    return res.status(400).json({ success: false, message: 'reportType and format are required' });
  }

  // Create pending Export Job
  const job = await ExportJob.create({
    tenantId,
    userId: req.user.id,
    reportType,
    format,
    status: 'pending',
  });

  // Process asynchronously
  setImmediate(async () => {
    try {
      await ExportJob.findByIdAndUpdate(job._id, { status: 'processing' });

      // Gather relevant data
      let data = [];
      const match = { tenantId };

      if (filters.startDate || filters.endDate) {
        const from = filters.startDate ? new Date(filters.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const to = filters.endDate ? new Date(filters.endDate) : new Date();
        match.date = { $gte: from, $lte: to };
      }

      if (reportType === 'headcount') {
        const emps = await Employee.find({ tenantId }).populate('departmentId designationId').lean();
        data = emps.map(e => ({
          'Employee ID': e.employeeId,
          'Full Name': `${e.firstName} ${e.lastName}`,
          'Official Email': e.officialEmail,
          'Department': e.departmentId?.name || '—',
          'Designation': e.designationId?.name || '—',
          'Status': e.status,
        }));
      } else if (reportType === 'attendance') {
        const records = await AttendanceRecord.find(match).populate('employeeId').lean();
        data = records.map(r => ({
          'Employee ID': r.employeeId?.employeeId || '—',
          'Full Name': r.employeeId ? `${r.employeeId.firstName} ${r.employeeId.lastName}` : 'Unknown',
          'Date': new Date(r.date).toLocaleDateString(),
          'Status': r.status,
          'Clock-In': r.firstIn ? new Date(r.firstIn).toLocaleTimeString() : '—',
          'Clock-Out': r.lastOut ? new Date(r.lastOut).toLocaleTimeString() : '—',
          'Worked Minutes': r.workedMinutes || 0,
        }));
      } else if (reportType === 'leave') {
        const requests = await LeaveRequest.find({ tenantId }).populate('employeeId leaveTypeId').lean();
        data = requests.map(l => ({
          'Employee ID': l.employeeId?.employeeId || '—',
          'Full Name': l.employeeId ? `${l.employeeId.firstName} ${l.employeeId.lastName}` : 'Unknown',
          'Leave Type': l.leaveTypeId?.name || '—',
          'From Date': new Date(l.fromDate).toLocaleDateString(),
          'To Date': new Date(l.toDate).toLocaleDateString(),
          'Total Days': l.totalDays,
          'Status': l.status,
        }));
      } else {
        // Fallback generic data dump
        data = [{ Message: 'Report type not supported for export data dump yet' }];
      }

      // Convert to requested format
      let fileContent = '';
      const filename = `export_${job._id}.${format}`;
      const exportDir = path.join(__dirname, '..', '..', 'uploads', 'exports');

      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      const filePath = path.join(exportDir, filename);

      if (format === 'csv' || format === 'xlsx') {
        // Build CSV content
        if (data.length > 0) {
          const headers = Object.keys(data[0]);
          fileContent += headers.join(',') + '\n';
          data.forEach(row => {
            fileContent += headers.map(h => `"${String(row[h]).replace(/"/g, '""')}"`).join(',') + '\n';
          });
        } else {
          fileContent = 'No data available for export';
        }
        fs.writeFileSync(filePath, fileContent);
      } else if (format === 'pdf') {
        // PDF Simulation: write clean text summary format
        fileContent += `HRMS REPORT - ${reportType.toUpperCase()}\n`;
        fileContent += `Generated At: ${new Date().toLocaleString()}\n`;
        fileContent += `==============================================\n\n`;
        if (data.length > 0) {
          const headers = Object.keys(data[0]);
          data.forEach((row, i) => {
            fileContent += `Record #${i + 1}\n`;
            headers.forEach(h => {
              fileContent += `  ${h}: ${row[h]}\n`;
            });
            fileContent += `----------------------------------------------\n`;
          });
        } else {
          fileContent += 'No records found.';
        }
        fs.writeFileSync(filePath, fileContent);
      }

      // Update Job status to completed
      const fileUrl = `/uploads/exports/${filename}`;
      await ExportJob.findByIdAndUpdate(job._id, {
        status: 'completed',
        fileUrl,
        completedAt: new Date(),
      });
    } catch (err) {
      console.error('Async export failed:', err);
      await ExportJob.findByIdAndUpdate(job._id, {
        status: 'failed',
        error: err.message,
      });
    }
  });

  res.json({ success: true, jobId: job._id, status: 'pending' });
};

// ─── Check Export Job Status ───────────────────────────────────────────────
exports.getExportStatus = async (req, res) => {
  const tenantId = req.tenantId;
  const { jobId } = req.params;

  const job = await ExportJob.findOne({ _id: jobId, tenantId });
  if (!job) {
    return res.status(404).json({ success: false, message: 'Export job not found' });
  }

  res.json({
    success: true,
    data: {
      id: job._id,
      status: job.status,
      fileUrl: job.fileUrl,
      error: job.error,
      completedAt: job.completedAt,
    }
  });
};
