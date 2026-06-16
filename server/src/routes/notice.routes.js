const express = require('express');
const router = express.Router();
const { createNotice, getActiveNotices } = require('../controllers/notice.controller');

router.post('/', createNotice);
router.get('/active', getActiveNotices);

module.exports = router;
