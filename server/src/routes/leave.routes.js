const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/leave.controller');
const { protect, requirePermission } = require('../middleware/auth.middleware');

router.use(protect);

// Leave Types
router.get('/types', ctrl.listLeaveTypes);
router.post('/types', requirePermission('leave:update'), ctrl.createLeaveType);

// Holidays
router.get('/holidays', ctrl.listHolidays);
router.post('/holidays', requirePermission('leave:update'), ctrl.createHoliday);

// Leave Requests
router.post('/apply', requirePermission('leave:create'), ctrl.apply);
router.get('/all', requirePermission('leave:view'), ctrl.allRequests);
router.get('/my', ctrl.myRequests);
router.get('/my/balances', ctrl.myBalances);
router.put('/cancel/:id', ctrl.cancel);
router.get('/team', requirePermission('leave:view'), ctrl.teamRequests);
router.put('/resolve/:id', requirePermission('leave:approve'), ctrl.resolve);

module.exports = router;
