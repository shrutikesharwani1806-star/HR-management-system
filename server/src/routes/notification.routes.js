const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notification.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/', ctrl.list);
router.put('/read-all', ctrl.markAllRead);
router.put('/:id/read', ctrl.markRead);

module.exports = router;
