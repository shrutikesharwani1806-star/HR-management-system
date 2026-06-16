require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Models
const Tenant = require('./src/models/Tenant');
const User = require('./src/models/User');
const Employee = require('./src/models/Employee');
const Department = require('./src/models/Department');
const Designation = require('./src/models/Designation');
const Location = require('./src/models/Location');
const Shift = require('./src/models/Shift');
const LeaveType = require('./src/models/LeaveType');
const LeaveBalance = require('./src/models/LeaveBalance');
const Holiday = require('./src/models/Holiday');

const TENANT_ID = 'demo_company_01';

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Clean existing demo data
  await Promise.all([
    Tenant.deleteMany({ tenantId: TENANT_ID }),
    User.deleteMany({ tenantId: TENANT_ID }),
    Employee.deleteMany({ tenantId: TENANT_ID }),
    Department.deleteMany({ tenantId: TENANT_ID }),
    Designation.deleteMany({ tenantId: TENANT_ID }),
    Location.deleteMany({ tenantId: TENANT_ID }),
    Shift.deleteMany({ tenantId: TENANT_ID }),
    LeaveType.deleteMany({ tenantId: TENANT_ID }),
    LeaveBalance.deleteMany({ tenantId: TENANT_ID }),
    Holiday.deleteMany({ tenantId: TENANT_ID }),
  ]);
  console.log('🗑️  Cleared old demo data');

  // 1. Create Tenant
  const tenant = await Tenant.create({
    tenantId: TENANT_ID,
    companyName: 'Demo Corp Pvt Ltd',
    domain: 'democorp.hrms.local',
    industry: 'Technology',
    status: 'active',
    plan: 'professional',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    contactEmail: 'hr@democorp.com',
    contactPhone: '+91-9876543210',
  });
  console.log(`🏢 Tenant created: ${tenant.companyName} (ID: ${TENANT_ID})`);

  // 2. Create Departments
  const [engineering, hr, sales, ops] = await Department.insertMany([
    { tenantId: TENANT_ID, name: 'Engineering', code: 'ENG' },
    { tenantId: TENANT_ID, name: 'Human Resources', code: 'HR' },
    { tenantId: TENANT_ID, name: 'Sales', code: 'SLS' },
    { tenantId: TENANT_ID, name: 'Operations', code: 'OPS' },
  ]);
  console.log('🏗️  Departments created');

  // 3. Create Designations
  const [sde, lead, manager, hrExec, hrManager, sdeSales] = await Designation.insertMany([
    { tenantId: TENANT_ID, name: 'Software Engineer', grade: 'L3' },
    { tenantId: TENANT_ID, name: 'Tech Lead', grade: 'L5' },
    { tenantId: TENANT_ID, name: 'Engineering Manager', grade: 'L6' },
    { tenantId: TENANT_ID, name: 'HR Executive', grade: 'L2' },
    { tenantId: TENANT_ID, name: 'HR Manager', grade: 'L4' },
    { tenantId: TENANT_ID, name: 'Sales Executive', grade: 'L2' },
  ]);
  console.log('💼 Designations created');

  // 4. Create Location
  const [hq] = await Location.insertMany([
    { tenantId: TENANT_ID, name: 'Headquarters', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560001', timezone: 'Asia/Kolkata', geofenceRadius: 200 },
  ]);
  console.log('📍 Locations created');

  // 5. Create Shift
  const [defaultShift] = await Shift.insertMany([
    { tenantId: TENANT_ID, name: 'General Shift', type: 'fixed', startTime: '09:00', endTime: '18:00', gracePeriodMinutes: 15, halfDayMinutes: 240, fullDayMinutes: 480, lateMarkAfterMinutes: 30, workDays: [1,2,3,4,5] },
  ]);
  console.log('⏰ Shifts created');

  // 6. Create Leave Types
  const [casual, sick, earned, cl] = await LeaveType.insertMany([
    { tenantId: TENANT_ID, name: 'Casual Leave', code: 'CL', category: 'casual', isPaid: true, requiresApproval: true, maxConsecutiveDays: 3 },
    { tenantId: TENANT_ID, name: 'Sick Leave', code: 'SL', category: 'sick', isPaid: true, requiresApproval: false, requiresMedicalCertificate: true, maxConsecutiveDays: 7 },
    { tenantId: TENANT_ID, name: 'Earned Leave', code: 'EL', category: 'earned', isPaid: true, requiresApproval: true, isCarryForward: true, maxCarryForwardDays: 15 },
    { tenantId: TENANT_ID, name: 'Loss of Pay', code: 'LOP', category: 'loss_of_pay', isPaid: false, requiresApproval: true },
  ]);
  console.log('📅 Leave types created');

  // 7. Create Holidays
  const year = new Date().getFullYear();
  await Holiday.insertMany([
    { tenantId: TENANT_ID, name: 'Republic Day', date: new Date(year, 0, 26), type: 'national' },
    { tenantId: TENANT_ID, name: 'Holi', date: new Date(year, 2, 14), type: 'national' },
    { tenantId: TENANT_ID, name: 'Independence Day', date: new Date(year, 7, 15), type: 'national' },
    { tenantId: TENANT_ID, name: 'Gandhi Jayanti', date: new Date(year, 9, 2), type: 'national' },
    { tenantId: TENANT_ID, name: 'Diwali', date: new Date(year, 9, 20), type: 'national' },
    { tenantId: TENANT_ID, name: 'Christmas', date: new Date(year, 11, 25), type: 'national' },
  ]);
  console.log('🎉 Holidays created');

  // 8. Create HR Admin Employee + User
  const hrAdminEmp = await Employee.create({
    tenantId: TENANT_ID, employeeId: 'EMP0001',
    firstName: 'Priya', lastName: 'Sharma',
    officialEmail: 'priya@democorp.com', phone: '9876543210',
    joiningDate: new Date('2022-01-10'), status: 'active', employmentType: 'permanent',
    departmentId: hr._id, designationId: hrManager._id, locationId: hq._id, shiftId: defaultShift._id,
  });
  const hrAdminUser = await User.create({
    tenantId: TENANT_ID, email: 'priya@democorp.com', password: 'Admin@1234',
    role: 'hr_admin', employeeId: hrAdminEmp._id,
  });
  await Employee.findByIdAndUpdate(hrAdminEmp._id, { userId: hrAdminUser._id });

  // 9. Create Manager Employee + User
  const managerEmp = await Employee.create({
    tenantId: TENANT_ID, employeeId: 'EMP0002',
    firstName: 'Rahul', lastName: 'Verma',
    officialEmail: 'rahul@democorp.com', phone: '9123456789',
    joiningDate: new Date('2021-06-01'), status: 'active', employmentType: 'permanent',
    departmentId: engineering._id, designationId: lead._id, locationId: hq._id, shiftId: defaultShift._id,
  });
  const managerUser = await User.create({
    tenantId: TENANT_ID, email: 'rahul@democorp.com', password: 'Manager@1234',
    role: 'manager', employeeId: managerEmp._id,
  });
  await Employee.findByIdAndUpdate(managerEmp._id, { userId: managerUser._id });

  // 10. Create Employee + User
  const empRecord = await Employee.create({
    tenantId: TENANT_ID, employeeId: 'EMP0003',
    firstName: 'Anjali', lastName: 'Mehta',
    officialEmail: 'anjali@democorp.com', phone: '9000000001',
    joiningDate: new Date('2023-03-15'), status: 'active', employmentType: 'permanent',
    departmentId: engineering._id, designationId: sde._id, locationId: hq._id,
    shiftId: defaultShift._id, managerId: managerEmp._id,
  });
  const empUser = await User.create({
    tenantId: TENANT_ID, email: 'anjali@democorp.com', password: 'Employee@1234',
    role: 'employee', employeeId: empRecord._id,
  });
  await Employee.findByIdAndUpdate(empRecord._id, { userId: empUser._id });

  // 10.5. Create Leadership Employee + User
  const leadershipEmp = await Employee.create({
    tenantId: TENANT_ID, employeeId: 'EMP0004',
    firstName: 'Vijay', lastName: 'Mallya',
    officialEmail: 'vijay@democorp.com', phone: '9000000002',
    joiningDate: new Date('2020-01-01'), status: 'active', employmentType: 'permanent',
    departmentId: engineering._id, designationId: manager._id, locationId: hq._id,
    shiftId: defaultShift._id,
  });
  const leadershipUser = await User.create({
    tenantId: TENANT_ID, email: 'vijay@democorp.com', password: 'Leadership@1234',
    role: 'leadership', employeeId: leadershipEmp._id,
  });
  await Employee.findByIdAndUpdate(leadershipEmp._id, { userId: leadershipUser._id });

  // 11. Seed leave balances for all employees
  const employees = [hrAdminEmp._id, managerEmp._id, empRecord._id, leadershipEmp._id];
  const leaveTypes = [{ type: casual._id, allocated: 12 }, { type: sick._id, allocated: 12 }, { type: earned._id, allocated: 21 }];
  const yr = new Date().getFullYear();
  for (const empId of employees) {
    for (const lt of leaveTypes) {
      await LeaveBalance.create({ tenantId: TENANT_ID, employeeId: empId, leaveTypeId: lt.type, year: yr, allocated: lt.allocated });
    }
  }
  console.log('💰 Leave balances seeded');

  console.log('\n🚀 ============ SEED COMPLETE ============');
  console.log(`📌 Tenant ID  : ${TENANT_ID}`);
  console.log('👩‍💼 HR Admin   : priya@democorp.com  / Admin@1234');
  console.log('👨‍💼 Manager    : rahul@democorp.com  / Manager@1234');
  console.log('👩‍💻 Employee   : anjali@democorp.com / Employee@1234');
  console.log('👑 Leadership : vijay@democorp.com  / Leadership@1234');
  console.log('=========================================\n');

  await mongoose.disconnect();
}

seed().catch((err) => { console.error(err); process.exit(1); });
