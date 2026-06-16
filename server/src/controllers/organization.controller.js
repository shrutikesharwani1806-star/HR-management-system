const Department = require('../models/Department');
const Designation = require('../models/Designation');
const Location = require('../models/Location');
const Tenant = require('../models/Tenant');

// ─── Departments ──────────────────────────────────────────────────────────
exports.createDept = async (req, res) => {
  const dept = await Department.create({ ...req.body, tenantId: req.tenantId });
  res.status(201).json({ success: true, data: dept });
};
exports.listDepts = async (req, res) => {
  const depts = await Department.find({ tenantId: req.tenantId, isActive: true }).populate('parentId', 'name').populate('headId', 'firstName lastName').sort('name');
  res.json({ success: true, data: depts });
};
exports.updateDept = async (req, res) => {
  const dept = await Department.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, req.body, { new: true });
  if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });
  res.json({ success: true, data: dept });
};
exports.deleteDept = async (req, res) => {
  await Department.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { isActive: false });
  res.json({ success: true, message: 'Department deactivated' });
};

// ─── Designations ─────────────────────────────────────────────────────────
exports.createDesignation = async (req, res) => {
  const des = await Designation.create({ ...req.body, tenantId: req.tenantId });
  res.status(201).json({ success: true, data: des });
};
exports.listDesignations = async (req, res) => {
  const des = await Designation.find({ tenantId: req.tenantId, isActive: true }).sort('name');
  res.json({ success: true, data: des });
};
exports.updateDesignation = async (req, res) => {
  const des = await Designation.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, req.body, { new: true });
  if (!des) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: des });
};

// ─── Locations ────────────────────────────────────────────────────────────
exports.createLocation = async (req, res) => {
  const loc = await Location.create({ ...req.body, tenantId: req.tenantId });
  res.status(201).json({ success: true, data: loc });
};
exports.listLocations = async (req, res) => {
  const locs = await Location.find({ tenantId: req.tenantId, isActive: true }).sort('name');
  res.json({ success: true, data: locs });
};
exports.updateLocation = async (req, res) => {
  const loc = await Location.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, req.body, { new: true });
  if (!loc) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: loc });
};

// ─── Company Profile ──────────────────────────────────────────────────────
exports.getCompany = async (req, res) => {
  const tenant = await Tenant.findOne({ tenantId: req.tenantId });
  res.json({ success: true, data: tenant });
};
exports.updateCompany = async (req, res) => {
  const tenant = await Tenant.findOneAndUpdate({ tenantId: req.tenantId }, req.body, { new: true });
  res.json({ success: true, data: tenant });
};
