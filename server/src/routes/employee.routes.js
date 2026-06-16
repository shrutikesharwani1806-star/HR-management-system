const express = require('express');
const router = express.Router();
const multer = require('multer');
const ctrl = require('../controllers/employee.controller');
const { protect, requirePermission, userHasPermission } = require('../middleware/auth.middleware');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Ownership or Role authorization helpers using dynamic permissions
const canReadEmployee = async (req, res, next) => {
  if (req.user.employeeId && req.user.employeeId.toString() === req.params.id) {
    return next();
  }
  const hasPerm = await userHasPermission(req.tenantId, req.user.role, req.user.permissions, 'employee:view', req.user.id) ||
                  await userHasPermission(req.tenantId, req.user.role, req.user.permissions, 'employee:read', req.user.id);
  if (hasPerm) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access Denied' });
};

const canUpdateEmployee = async (req, res, next) => {
  if (req.user.employeeId && req.user.employeeId.toString() === req.params.id) {
    return next();
  }
  const hasPerm = await userHasPermission(req.tenantId, req.user.role, req.user.permissions, 'employee:update', req.user.id);
  if (hasPerm) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access Denied' });
};

router.use(protect);

router.get('/me', ctrl.myProfile);
router.get('/org-chart', ctrl.orgChart);
router.get('/', requirePermission('employee:view'), ctrl.list);
router.post('/', requirePermission('employee:create'), ctrl.create);
router.get('/:id', canReadEmployee, ctrl.getOne);
router.get('/:id/activity', canReadEmployee, ctrl.getActivity);
router.put('/:id', canUpdateEmployee, ctrl.update);
router.post('/:id/photo', canUpdateEmployee, upload.single('photo'), ctrl.uploadPhoto);
router.post('/:id/documents', canUpdateEmployee, upload.single('document'), ctrl.uploadDocument);
router.post('/:id/transfer', requirePermission('employee:update'), ctrl.initiateTransfer);
router.post('/:id/terminate', requirePermission('employee:delete'), ctrl.terminate);

module.exports = router;
