const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/auth.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.post('/register', protect, authorize('hr_admin', 'leadership'), ctrl.register);
router.post('/login', ctrl.login);
router.get('/activate/verify', ctrl.verifyActivationToken);
router.post('/activate', (req, res, next) => {
  if (req.headers.authorization) {
    return protect(req, res, next);
  }
  next();
}, ctrl.completeActivation);
router.post('/refresh', ctrl.refresh);
router.post('/logout', protect, ctrl.logout);
router.get('/me', protect, ctrl.me);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword);
router.post('/forgot-password-otp', ctrl.forgotPasswordOtp);
router.post('/reset-password-otp', ctrl.resetPasswordOtp);
router.put('/change-password', protect, ctrl.changePassword);

// MFA and SSO
router.post('/verify-mfa', ctrl.verifyMfa);
router.post('/mfa/enable', protect, ctrl.enableMfa);
router.post('/mfa/disable', protect, ctrl.disableMfa);
router.post('/google-sso', ctrl.googleSso);
router.post('/microsoft-sso', ctrl.microsoftSso);
router.post('/saml-sso', ctrl.samlSso);

// User Registration Approvals (HR Admin only)
router.get('/pending-registrations', protect, authorize('hr_admin', 'super_admin'), ctrl.getPendingApprovals);
router.put('/approve-registration/:userId', protect, authorize('hr_admin', 'super_admin'), ctrl.approveUser);
router.delete('/reject-registration/:userId', protect, authorize('hr_admin', 'super_admin'), ctrl.rejectUser);

// Create HR Admin (Leadership or HR Admin can create new HR admins — auto-approved)
router.post('/create-hr-admin', protect, authorize('leadership', 'hr_admin', 'super_admin'), ctrl.createHrAdmin);

// Create Manager (Leadership or HR Admin can create new managers — auto-approved)
router.post('/create-manager', protect, authorize('leadership', 'hr_admin', 'super_admin'), ctrl.createManager);

// User Management (Leadership / HR Admin)
router.get('/users', protect, authorize('leadership', 'hr_admin', 'super_admin'), ctrl.listUsers);
router.patch('/users/:userId/toggle-status', protect, authorize('leadership', 'hr_admin', 'super_admin'), ctrl.toggleUserStatus);
router.put('/users/:userId/reset-password', protect, authorize('leadership', 'hr_admin', 'super_admin'), ctrl.resetUserPassword);
router.put('/users/:userId/permissions', protect, authorize('leadership', 'super_admin'), ctrl.updateUserPermissions);

module.exports = router;
