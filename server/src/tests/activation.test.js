process.env.JWT_SECRET = 'test_secret_key_12345';
process.env.JWT_EXPIRES_IN = '1d';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_key_67890';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

const { verifyActivationToken, completeActivation } = require('../controllers/auth.controller');
const { create: createEmployee } = require('../controllers/employee.controller');
const User = require('../models/User');
const Employee = require('../models/Employee');
const AuditLog = require('../models/AuditLog');

// Mock Mongoose Models explicitly
jest.mock('../models/User', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn()
}));

jest.mock('../models/Employee', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn()
}));

jest.mock('../models/AuditLog', () => ({
  create: jest.fn()
}));

jest.mock('../models/Role', () => ({
  findOne: jest.fn(),
  create: jest.fn()
}));

jest.mock('../models/Tenant', () => ({
  findOne: jest.fn(),
  create: jest.fn()
}));

// Mock notification service
jest.mock('../services/notification.service', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true })
}));

// Mock rbac service
jest.mock('../services/rbac.service', () => ({
  syncUserRoles: jest.fn().mockResolvedValue(true),
  resolveUserPermissions: jest.fn().mockResolvedValue({ permissions: [], roles: [] })
}));

describe('Onboarding and Activation Flow Tests', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      query: {},
      body: {},
      ip: '127.0.0.1',
      headers: {},
      user: { id: 'admin_id', email: 'admin@company.com' },
      tenantId: 'test_tenant'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('verifyActivationToken', () => {
    it('should return 400 if activation token is missing', async () => {
      await verifyActivationToken(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Activation token is required.'
      }));
    });

    it('should return 400 if activation token is invalid or expired', async () => {
      req.query.token = 'expired_or_invalid_token';
      User.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      });

      await verifyActivationToken(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Invalid or expired activation link.'
      }));
    });

    it('should verify activation token successfully and return invite metadata', async () => {
      req.query.token = 'valid_active_token';
      const mockUser = {
        email: 'invited@company.com',
        role: 'employee',
        tenantId: 'test_tenant',
        employeeId: { firstName: 'Jane', lastName: 'Doe' }
      };

      User.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser)
      });

      await verifyActivationToken(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          email: 'invited@company.com',
          role: 'employee',
          tenantId: 'test_tenant'
        })
      }));
    });
  });

  describe('completeActivation', () => {
    it('should return 400 if new password is not supplied', async () => {
      req.body = { token: 'valid_token' };
      await completeActivation(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'New password is required.'
      }));
    });

    it('should successfully activate user, accept policies and update employee status/onboarding info', async () => {
      req.body = {
        token: 'valid_token',
        password: 'NewSecurePassword@123',
        personalEmail: 'jane.personal@gmail.com',
        phone: '9876543210',
        currentAddress: '456 Tech Park, City',
        maritalStatus: 'single',
        bloodGroup: 'AB+',
        gender: 'female'
      };

      const mockSave = jest.fn().mockResolvedValue(true);
      const mockUser = {
        _id: 'user_id_123',
        email: 'invited@company.com',
        role: 'employee',
        tenantId: 'test_tenant',
        employeeId: 'employee_id_123',
        password: '',
        isActivated: false,
        acceptedPolicies: false,
        hasCompletedOnboarding: false,
        save: mockSave
      };

      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      User.findByIdAndUpdate.mockResolvedValue(true);
      Employee.findByIdAndUpdate.mockResolvedValue(true);
      AuditLog.create.mockResolvedValue(true);

      await completeActivation(req, res);

      expect(mockUser.isActivated).toBe(true);
      expect(mockUser.acceptedPolicies).toBe(true);
      expect(mockUser.hasCompletedOnboarding).toBe(true);
      expect(mockSave).toHaveBeenCalled();
      expect(Employee.findByIdAndUpdate).toHaveBeenCalledWith('employee_id_123', expect.objectContaining({
        status: 'active',
        personalEmail: 'jane.personal@gmail.com',
        phone: '9876543210',
        maritalStatus: 'single',
        bloodGroup: 'AB+',
        gender: 'female'
      }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Account activated successfully!'
      }));
    });
  });

  describe('createEmployee Invitation Flow', () => {
    it('should generate activation token and dispatch email invitation to new employee', async () => {
      req.body = {
        employeeId: 'EMP2002',
        firstName: 'Dave',
        lastName: 'Miller',
        officialEmail: 'dave@company.com',
        role: 'employee',
        createAccount: true
      };

      const mockEmployee = {
        _id: 'new_employee_id',
        employeeId: 'EMP2002',
        firstName: 'Dave',
        lastName: 'Miller',
        officialEmail: 'dave@company.com',
        save: jest.fn().mockResolvedValue(true)
      };

      Employee.findOne.mockResolvedValue(null);
      Employee.create.mockResolvedValue(mockEmployee);
      Employee.countDocuments.mockResolvedValue(0);
      User.create.mockResolvedValue({
        _id: 'new_user_id',
        email: 'dave@company.com'
      });
      AuditLog.create.mockResolvedValue(true);

      const { sendEmail } = require('../services/notification.service');

      await createEmployee(req, res);

      expect(Employee.create).toHaveBeenCalled();
      expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
        email: 'dave@company.com',
        isActivated: false,
        role: 'employee'
      }));
      expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
        to: 'dave@company.com',
        subject: 'Welcome to HRMS - Activate Your Account'
      }));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          activationLink: expect.stringContaining('/activate?token=')
        })
      }));
    });
  });
});
