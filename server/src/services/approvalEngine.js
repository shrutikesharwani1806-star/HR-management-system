const Approval = require('../models/Approval');
const Employee = require('../models/Employee');
const AuditLog = require('../models/AuditLog');

/**
 * Determine the approval stages (levels) based on request details and routing rules.
 */
async function getWorkflowConfiguration(tenantId, entityType, requestedById, metadata) {
  const employee = await Employee.findById(requestedById).populate('userId', 'role').lean();
  if (!employee) throw new Error('Employee not found');

  const managerId = employee.managerId;
  const userRole = employee.userId?.role || 'employee';
  
  // Default SLA: 48 hours
  const slaDeadline = new Date(Date.now() + 48 * 3600 * 1000);

  const stages = [];

  if (entityType === 'leave_request') {
    // HIERARCHICAL ROUTING:
    if (userRole === 'hr_admin') {
      stages.push({
        level: 1,
        approverRole: 'leadership',
        status: 'pending',
        slaDeadline,
      });
    } else if (userRole === 'manager') {
      stages.push({
        level: 1,
        approverRole: 'hr_admin',
        status: 'pending',
        slaDeadline,
      });
    } else {
      // Standard employee routing:
      if (metadata.totalDays > 5) {
        if (managerId) {
          stages.push({ level: 1, approverId: managerId, approverRole: 'manager', status: 'pending', slaDeadline });
          stages.push({ level: 2, approverRole: 'hr_admin', status: 'pending', slaDeadline });
        } else {
          stages.push({ level: 1, approverRole: 'hr_admin', status: 'pending', slaDeadline });
        }
      } else {
        if (managerId) {
          stages.push({ level: 1, approverId: managerId, approverRole: 'manager', status: 'pending', slaDeadline });
        } else {
          stages.push({ level: 1, approverRole: 'hr_admin', status: 'pending', slaDeadline });
        }
      }
    }
  } else if (entityType === 'transfer') {
    // Multi-level: Manager approval first, then HR Admin
    if (managerId) {
      stages.push({
        level: 1,
        approverId: managerId,
        approverRole: 'manager',
        status: 'pending',
        slaDeadline,
      });
    }
    stages.push({
      level: managerId ? 2 : 1,
      approverRole: 'hr_admin',
      status: 'pending',
      slaDeadline,
    });
  } else if (entityType === 'attendance_regularization') {
    // Single-level: Manager
    if (managerId) {
      stages.push({
        level: 1,
        approverId: managerId,
        approverRole: 'manager',
        status: 'pending',
        slaDeadline,
      });
    } else {
      stages.push({
        level: 1,
        approverRole: 'hr_admin',
        status: 'pending',
        slaDeadline,
      });
    }
  } else {
    // Default (e.g. profile_update): HR Admin approval
    stages.push({
      level: 1,
      approverRole: 'hr_admin',
      status: 'pending',
      slaDeadline,
    });
  }

  return stages;
}

/**
 * Log approval action in the AuditLog collection
 */
async function logApprovalAction(tenantId, approvalId, userId, action, details) {
  await AuditLog.create({
    tenantId,
    userId,
    action: `approval_${action}`,
    module: 'workflow',
    details: `Approval ID: ${approvalId}. ${details}`,
    ipAddress: 'system',
    userAgent: 'system-approval-engine',
  });
}

/**
 * Submit a request to the approval engine.
 */
async function submitRequest(tenantId, entityType, entityId, requestedById, metadata) {
  const stages = await getWorkflowConfiguration(tenantId, entityType, requestedById, metadata);

  const approval = await Approval.create({
    tenantId,
    entityType,
    entityId,
    requestedBy: requestedById,
    status: 'pending',
    currentLevel: 1,
    totalLevels: stages.length,
    stages,
    metadata,
    slaHours: 48,
    slaDeadline: new Date(Date.now() + 48 * 3600 * 1000),
  });

  await logApprovalAction(
    tenantId,
    approval._id,
    requestedById,
    'submitted',
    `New approval request submitted for ${entityType} (${entityId}). Total stages: ${stages.length}`
  );

  return approval;
}

/**
 * Resolve the current stage of an approval request.
 */
async function resolveStage(tenantId, approvalId, approverUserId, action, comment) {
  const approval = await Approval.findOne({ _id: approvalId, tenantId });
  if (!approval) throw new Error('Approval request not found');
  if (approval.status !== 'pending') throw new Error('Approval request is not pending');

  const approverEmp = await Employee.findOne({ userId: approverUserId, tenantId });
  if (!approverEmp) throw new Error('Approver employee profile not found');

  // Find the active stage matching the currentLevel
  const currentStageIndex = approval.stages.findIndex(s => s.level === approval.currentLevel);
  if (currentStageIndex === -1) throw new Error('Current approval stage not found');

  const stage = approval.stages[currentStageIndex];

  // Verify authorization: must either match the specific approverId, or match the role (for role-based fallbacks)
  const isSpecificApprover = stage.approverId && stage.approverId.toString() === approverEmp._id.toString();
  const hasMatchingRole = stage.approverRole && approverEmp.role === stage.approverRole;
  
  if (!isSpecificApprover && !hasMatchingRole) {
    throw new Error('Not authorized to approve/reject at this stage');
  }

  // Update current stage
  stage.status = action === 'approve' ? 'approved' : 'rejected';
  stage.action = action;
  stage.comment = comment;
  stage.actionAt = new Date();

  await logApprovalAction(
    tenantId,
    approval._id,
    approverEmp._id,
    action,
    `Resolved stage ${approval.currentLevel} as ${action}. Comment: ${comment || 'None'}`
  );

  if (action === 'reject') {
    // If rejected, entire workflow is rejected immediately
    approval.status = 'rejected';
    approval.completedAt = new Date();
  } else {
    // If approved, check if we have more levels
    if (approval.currentLevel < approval.totalLevels) {
      approval.currentLevel += 1;
      
      // Update next stage's status to pending (if not already set)
      const nextStageIndex = approval.stages.findIndex(s => s.level === approval.currentLevel);
      if (nextStageIndex !== -1) {
        approval.stages[nextStageIndex].status = 'pending';
        approval.stages[nextStageIndex].slaDeadline = new Date(Date.now() + 48 * 3600 * 1000);
      }
    } else {
      // All levels approved, mark overall approval as approved
      approval.status = 'approved';
      approval.completedAt = new Date();
    }
  }

  await approval.save();
  return approval;
}

/**
 * Delegate an approval stage to another employee.
 */
async function delegateStage(tenantId, approvalId, currentApproverUserId, delegateToEmpId, comment) {
  const approval = await Approval.findOne({ _id: approvalId, tenantId });
  if (!approval) throw new Error('Approval request not found');
  if (approval.status !== 'pending') throw new Error('Approval request is not pending');

  const currentApprover = await Employee.findOne({ userId: currentApproverUserId, tenantId });
  if (!currentApprover) throw new Error('Current approver profile not found');

  const delegateToEmp = await Employee.findOne({ _id: delegateToEmpId, tenantId });
  if (!delegateToEmp) throw new Error('Delegation target employee not found');

  const currentStageIndex = approval.stages.findIndex(s => s.level === approval.currentLevel);
  if (currentStageIndex === -1) throw new Error('Current approval stage not found');

  const stage = approval.stages[currentStageIndex];

  // Verify auth to delegate
  const isSpecificApprover = stage.approverId && stage.approverId.toString() === currentApprover._id.toString();
  const hasMatchingRole = stage.approverRole && currentApprover.role === stage.approverRole;
  if (!isSpecificApprover && !hasMatchingRole) {
    throw new Error('Not authorized to delegate this stage');
  }

  // Record delegation details
  stage.status = 'delegated';
  stage.comment = `Delegated to ${delegateToEmp.firstName} ${delegateToEmp.lastName}. Reason: ${comment || 'None'}`;
  stage.actionAt = new Date();
  stage.delegatedTo = delegateToEmp._id;

  // Insert a sub-stage or replace the current stage's target approver
  // To keep it simple, we replace the active stage's approver and reset the status to pending
  stage.approverId = delegateToEmp._id;
  stage.status = 'pending';
  stage.slaDeadline = new Date(Date.now() + 48 * 3600 * 1000); // Reset SLA deadline for the delegatee

  await logApprovalAction(
    tenantId,
    approval._id,
    currentApprover._id,
    'delegated',
    `Delegated stage ${approval.currentLevel} to ${delegateToEmp.firstName} ${delegateToEmp.lastName}. Comment: ${comment || 'None'}`
  );

  await approval.save();
  return approval;
}

/**
 * Escalate an approval stage if it has breached the SLA deadline.
 */
async function escalateSLA(tenantId, approvalId) {
  const approval = await Approval.findOne({ _id: approvalId, tenantId });
  if (!approval) throw new Error('Approval request not found');
  if (approval.status !== 'pending') throw new Error('Approval request is not pending');

  const currentStageIndex = approval.stages.findIndex(s => s.level === approval.currentLevel);
  if (currentStageIndex === -1) throw new Error('Current approval stage not found');

  const stage = approval.stages[currentStageIndex];
  if (new Date() < stage.slaDeadline) {
    throw new Error('SLA deadline has not passed yet');
  }

  stage.isEscalated = true;
  
  // Escalation policy:
  // If a manager failed to respond within the SLA, escalate it to the HR Admin group.
  if (stage.approverRole === 'manager') {
    stage.approverRole = 'hr_admin';
    stage.approverId = null; // Re-route to any available HR Admin
    stage.comment = `SLA breached. Escalated to HR admin.`;
  } else {
    // If already at HR Admin or Super Admin, escalate status to 'escalated' overall
    approval.status = 'escalated';
  }

  await logApprovalAction(
    tenantId,
    approval._id,
    null,
    'escalated',
    `SLA breached for stage ${approval.currentLevel}. Request escalated.`
  );

  await approval.save();
  return approval;
}

module.exports = {
  submitRequest,
  resolveStage,
  delegateStage,
  escalateSLA,
};
