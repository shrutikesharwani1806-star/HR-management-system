const express = require('express');
const router = express.Router();
const multer = require('multer');
const ctrl = require('../controllers/payslip.controller');
const { protect, requirePermission } = require('../middleware/auth.middleware');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(protect);

router.post('/', requirePermission('payroll:generate'), upload.single('payslip'), ctrl.createPayslip);
router.get('/my', ctrl.myPayslips);
router.get('/all', requirePermission('payroll:view'), ctrl.allPayslips);

module.exports = router;
