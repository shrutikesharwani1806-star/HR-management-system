const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/attendance.controller');
const { protect, requirePermission } = require('../middleware/auth.middleware');

router.use(protect);

router.post('/punch', requirePermission('attendance:create'), ctrl.punch);
router.get('/my', ctrl.myAttendance);
router.get('/team', requirePermission('attendance:view'), ctrl.teamAttendance);
router.post('/regularize', requirePermission('attendance:create'), ctrl.regularize);
router.get('/all', requirePermission('attendance:view'), ctrl.allAttendance);
router.put('/correct/:id', requirePermission('attendance:update'), ctrl.correctAttendance);

// Shifts
router.get('/shifts', ctrl.listShifts);
router.post('/shifts', requirePermission('attendance:update'), ctrl.createShift);

module.exports = router;
