const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/audit.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect, authorize('hr_admin', 'super_admin'));
router.get('/', ctrl.list);

module.exports = router;
