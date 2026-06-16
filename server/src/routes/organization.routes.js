const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/organization.controller');
const { protect, requirePermission } = require('../middleware/auth.middleware');

router.use(protect);

// Departments
router.get('/departments', ctrl.listDepts);
router.post('/departments', requirePermission('settings:update'), ctrl.createDept);
router.put('/departments/:id', requirePermission('settings:update'), ctrl.updateDept);
router.delete('/departments/:id', requirePermission('settings:update'), ctrl.deleteDept);

// Designations
router.get('/designations', ctrl.listDesignations);
router.post('/designations', requirePermission('settings:update'), ctrl.createDesignation);
router.put('/designations/:id', requirePermission('settings:update'), ctrl.updateDesignation);

// Locations
router.get('/locations', ctrl.listLocations);
router.post('/locations', requirePermission('settings:update'), ctrl.createLocation);
router.put('/locations/:id', requirePermission('settings:update'), ctrl.updateLocation);

// Company
router.get('/company', ctrl.getCompany);
router.put('/company', requirePermission('settings:update'), ctrl.updateCompany);

module.exports = router;
