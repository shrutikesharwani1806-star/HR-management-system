const Payslip = require('../models/Payslip');
const Employee = require('../models/Employee');
const AuditLog = require('../models/AuditLog');
const { uploadMulterFile } = require('../services/storage.service');

// ─── Create or Upload Payslip ─────────────────────────────────────────────
exports.createPayslip = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { employeeId, month, year, basicSalary, allowances, deductions, remarks, status = 'paid' } = req.body;

    if (!employeeId || !month || !year) {
      return res.status(400).json({ success: false, message: 'Employee ID, month, and year are required.' });
    }

  // Ensure employee belongs to the current tenant
  const employee = await Employee.findOne({ _id: employeeId, tenantId });
  if (!employee) {
    return res.status(404).json({ success: false, message: 'Employee not found in this tenant organization.' });
  }

  let fileUrl = '';
  if (req.file) {
    const { key } = await uploadMulterFile(req.file, 'payslips', tenantId);
    fileUrl = key;
  }

  const basic = parseFloat(basicSalary) || 0;
  
  let allowanceBreakdown = [];
  let deductionBreakdown = [];
  try {
    if (req.body.allowanceBreakdown) allowanceBreakdown = JSON.parse(req.body.allowanceBreakdown);
    if (req.body.deductionBreakdown) deductionBreakdown = JSON.parse(req.body.deductionBreakdown);
  } catch (e) {}

  const allow = allowanceBreakdown.length > 0 
    ? allowanceBreakdown.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
    : parseFloat(allowances) || 0;
    
  const deduct = deductionBreakdown.length > 0
    ? deductionBreakdown.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
    : parseFloat(deductions) || 0;
    
  const net = basic + allow - deduct;

  const payslip = await Payslip.create({
    tenantId,
    employeeId,
    month: parseInt(month),
    year: parseInt(year),
    basicSalary: basic,
    allowanceBreakdown,
    deductionBreakdown,
    allowances: allow,
    deductions: deduct,
    netSalary: net,
    status,
    fileUrl,
    uploadedBy: req.user.id,
    remarks
  });

    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userEmail: req.user.email,
      module: 'payroll',
      action: 'upload_payslip',
      details: `Uploaded payslip for employee ${employeeId} for period ${month}/${year}`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, message: 'Payslip recorded and monthly payment set as done.', data: payslip });
  } catch (err) {
    console.error('Payslip Creation Error:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error: ' + err.message });
  }
};

// ─── My Payslips (Employee View) ──────────────────────────────────────────
exports.myPayslips = async (req, res) => {
  const tenantId = req.tenantId;
  const employee = await Employee.findOne({ userId: req.user.id, tenantId });
  if (!employee) {
    return res.status(404).json({ success: false, message: 'Employee profile not found' });
  }

  // Get only this employee's payslips for the correct tenant
  const payslips = await Payslip.find({ employeeId: employee._id, tenantId }).sort('-year -month');
  res.json({ success: true, data: payslips });
};

// ─── All Payslips (HR/Admin View) ─────────────────────────────────────────
exports.allPayslips = async (req, res) => {
  const tenantId = req.tenantId;
  const { month, year } = req.query;

  const query = { tenantId };
  if (month) query.month = parseInt(month);
  if (year) query.year = parseInt(year);

  const payslips = await Payslip.find(query)
    .populate('employeeId', 'firstName lastName employeeId departmentId')
    .sort('-year -month');

  res.json({ success: true, data: payslips });
};
