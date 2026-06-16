const express = require('express');
const router = express.Router();
const Approval = require('../models/Approval');
const Employee = require('../models/Employee');
const { protect } = require('../middleware/auth.middleware');
const approvalEngine = require('../services/approvalEngine');

router.use(protect);

// My pending approvals (approver view)
router.get('/pending', async (req, res) => {
  const emp = await Employee.findOne({ userId: req.user.id, tenantId: req.tenantId });
  if (!emp) return res.status(404).json({ success: false, message: 'Profile not found' });
  
  // Show approvals where the user is the current active stage approver or the stage specifies their role
  const approvals = await Approval.find({
    tenantId: req.tenantId,
    status: 'pending',
    stages: {
      $elemMatch: {
        level: { $eq: '$currentLevel' }, // Wait, in MongoDB we can do custom find or filter in JS
      }
    }
  }).populate('requestedBy', 'firstName lastName employeeId').sort('-createdAt').lean();

  // Filter approvals in JS to ensure only the active level is returned and user is authorized
  const activeApprovals = approvals.filter(a => {
    const activeStage = a.stages.find(s => s.level === a.currentLevel);
    if (!activeStage || activeStage.status !== 'pending') return false;
    
    const isSpecificApprover = activeStage.approverId && activeStage.approverId.toString() === emp._id.toString();
    const hasMatchingRole = activeStage.approverRole && emp.role === activeStage.approverRole;
    return isSpecificApprover || hasMatchingRole;
  });

  res.json({ success: true, data: activeApprovals });
});

// Resolve approval (Approve/Reject)
router.put('/resolve/:id', async (req, res) => {
  const { id } = req.params;
  const { action, comment } = req.body;
  const tenantId = req.tenantId;

  const approver = await Employee.findOne({ userId: req.user.id, tenantId });
  if (!approver) return res.status(403).json({ success: false, message: 'Only registered employees can approve/reject' });

  let approval;
  try {
    approval = await approvalEngine.resolveStage(tenantId, id, req.user.id, action, comment);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }

  // Only perform migrations when the overall workflow state is complete
  if (approval.status === 'approved' || approval.status === 'rejected') {
    const isApproved = approval.status === 'approved';

    if (approval.entityType === 'profile_update') {
      if (isApproved) {
        const pendingFields = approval.metadata?.pendingFields || {};
        const updatePayload = {};

        if (pendingFields.pan) updatePayload.pan = pendingFields.pan;
        if (pendingFields.aadhaar) updatePayload.aadhaar = pendingFields.aadhaar;
        if (pendingFields.bankDetails) {
          updatePayload.bankDetails = pendingFields.bankDetails;
        }

        await Employee.findOneAndUpdate(
          { _id: approval.entityId, tenantId },
          { $set: updatePayload }
        );
      }
    } else if (approval.entityType === 'leave_request') {
      const LeaveRequest = require('../models/LeaveRequest');
      const LeaveBalance = require('../models/LeaveBalance');
      const AttendanceRecord = require('../models/AttendanceRecord');

      const leave = await LeaveRequest.findOne({ _id: approval.entityId, tenantId }).populate('leaveTypeId');
      if (leave) {
        if (isApproved) {
          leave.status = 'approved';
          leave.approvedBy = `${approver.firstName} ${approver.lastName}`;
          leave.approvedAt = new Date();
          await leave.save();

          await LeaveBalance.findOneAndUpdate(
            { tenantId, employeeId: leave.employeeId, leaveTypeId: leave.leaveTypeId?._id || leave.leaveTypeId, year: leave.fromDate.getFullYear() },
            { $inc: { pending: -leave.totalDays, used: leave.totalDays } }
          );

          for (let d = new Date(leave.fromDate); d <= leave.toDate; d.setDate(d.getDate() + 1)) {
            const date = new Date(d); date.setHours(0, 0, 0, 0);
            await AttendanceRecord.findOneAndUpdate({ tenantId, employeeId: leave.employeeId, date }, { status: 'on_leave' }, { upsert: true, setDefaultsOnInsert: true });
          }
        } else {
          leave.status = 'rejected';
          leave.rejectedBy = `${approver.firstName} ${approver.lastName}`;
          leave.rejectedAt = new Date();
          leave.rejectionReason = comment;
          await leave.save();

          await LeaveBalance.findOneAndUpdate(
            { tenantId, employeeId: leave.employeeId, leaveTypeId: leave.leaveTypeId?._id || leave.leaveTypeId, year: leave.fromDate.getFullYear() },
            { $inc: { pending: -leave.totalDays } }
          );
        }

        // Trigger Notification
        const { triggerNotification } = require('../services/notification.service');
        await triggerNotification(tenantId, leave.employeeId, isApproved ? 'leave_approved' : 'leave_rejected', {
          leaveType: leave.leaveTypeId?.name || 'Leave',
          fromDate: new Date(leave.fromDate).toLocaleDateString(),
          toDate: new Date(leave.toDate).toLocaleDateString(),
          reason: comment || ''
        }).catch(err => console.error('Notification error:', err));
      }
    } else if (approval.entityType === 'transfer') {
      if (isApproved) {
        const updatePayload = {};
        if (approval.metadata?.departmentId) updatePayload.departmentId = approval.metadata.departmentId;
        if (approval.metadata?.designationId) updatePayload.designationId = approval.metadata.designationId;
        if (approval.metadata?.locationId) updatePayload.locationId = approval.metadata.locationId;
        if (approval.metadata?.managerId) updatePayload.managerId = approval.metadata.managerId;

        await Employee.findOneAndUpdate(
          { _id: approval.entityId, tenantId },
          { $set: updatePayload }
        );
      }
    } else if (approval.entityType === 'attendance_regularization') {
      const AttendanceRecord = require('../models/AttendanceRecord');
      const record = await AttendanceRecord.findOne({ _id: approval.entityId, tenantId });
      if (record) {
        if (isApproved) {
          record.regularizationStatus = 'approved';
          record.status = 'present';
          if (approval.metadata?.inTime) record.firstIn = new Date(approval.metadata.inTime);
          if (approval.metadata?.outTime) record.lastOut = new Date(approval.metadata.outTime);
          if (record.firstIn && record.lastOut) {
            record.workedMinutes = Math.round((record.lastOut - record.firstIn) / 60000);
          }
        } else {
          record.regularizationStatus = 'rejected';
        }
        await record.save();

        // Trigger Notification
        const { triggerNotification } = require('../services/notification.service');
        await triggerNotification(tenantId, record.employeeId, 'attendance_regularization', {
          date: new Date(record.date).toLocaleDateString(),
          status: isApproved ? 'approved' : 'rejected'
        }).catch(err => console.error('Notification error:', err));
      }
    }
  }

  res.json({ success: true, message: `Approval resolve processed. Status: ${approval.status}` });
});

// Delegate approval stage
router.put('/delegate/:id', async (req, res) => {
  const { id } = req.params;
  const { delegateToEmpId, comment } = req.body;
  const tenantId = req.tenantId;

  try {
    const approval = await approvalEngine.delegateStage(tenantId, id, req.user.id, delegateToEmpId, comment);
    res.json({ success: true, message: 'Approval delegated successfully', data: approval });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// SLA Escalation check trigger
router.put('/escalate/:id', async (req, res) => {
  const { id } = req.params;
  const tenantId = req.tenantId;

  try {
    const approval = await approvalEngine.escalateSLA(tenantId, id);
    res.json({ success: true, message: 'Approval escalated successfully', data: approval });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Get all approvals (HR)
router.get('/', async (req, res) => {
  const { status, entityType, page = 1, limit = 20 } = req.query;
  const query = { tenantId: req.tenantId };
  if (status) query.status = status;
  if (entityType) query.entityType = entityType;
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [data, total] = await Promise.all([
    Approval.find(query).populate('requestedBy', 'firstName lastName employeeId').sort('-createdAt').skip(skip).limit(parseInt(limit)).lean(),
    Approval.countDocuments(query),
  ]);
  res.json({ success: true, data, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
});

module.exports = router;
