const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reporting.controller');
const { protect, requirePermission } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/dashboard', requirePermission('report:view'), ctrl.dashboard);
router.get('/headcount', requirePermission('report:view'), ctrl.headcount);
router.get('/attendance-summary', requirePermission('report:view'), ctrl.attendanceSummary);
router.get('/leave-summary', requirePermission('report:view'), ctrl.leaveSummary);
router.get('/overtime', requirePermission('report:view'), ctrl.overtime);
router.get('/late-arrivals', requirePermission('report:view'), ctrl.lateArrivals);
router.get('/absence', requirePermission('report:view'), ctrl.absence);
router.get('/leadership-overview', requirePermission('report:view'), ctrl.leadershipOverview);
router.get('/attrition', requirePermission('report:view'), ctrl.attrition);

// Async exports
router.post('/export', requirePermission('report:export'), ctrl.triggerExport);
router.get('/export/status/:jobId', requirePermission('report:view'), ctrl.getExportStatus);

module.exports = router;
