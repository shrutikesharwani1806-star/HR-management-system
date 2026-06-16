const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true }, // e.g. EMP001 — unique per tenant

  // Personal
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  middleName: String,
  dateOfBirth: Date,
  gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
  photoUrl: String,
  maritalStatus: { type: String, enum: ['single', 'married', 'divorced', 'widowed'] },
  nationality: String,
  bloodGroup: String,

  // Contact
  officialEmail: { type: String, required: true, lowercase: true },
  personalEmail: { type: String, lowercase: true },
  phone: String,
  alternatePhone: String,
  currentAddress: Object,
  permanentAddress: Object,
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String,
    email: String,
  },

  // Employment
  joiningDate: { type: Date, required: true },
  confirmationDate: Date,
  exitDate: Date,
  status: {
    type: String,
    enum: ['active', 'probation', 'notice', 'terminated', 'resigned', 'retired'],
    default: 'probation',
    index: true,
  },
  employmentType: {
    type: String,
    enum: ['permanent', 'contractual', 'intern', 'consultant'],
    default: 'permanent',
  },

  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  designationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Designation' },
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },
  grade: String,
  band: String,
  costCenter: String,

  // Bank & Statutory (sensitive — selected explicitly only)
  bankDetails: {
    type: {
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      branchName: String,
      accountType: String,
    },
    select: false,
  },
  pan: { type: String, select: false },
  aadhaar: { type: String, select: false },
  pf: { type: String, select: false },
  esi: { type: String, select: false },
  uan: { type: String, select: false },

  // Professional
  education: [{
    degree: String,
    institution: String,
    year: Number,
    grade: String,
    documentUrl: String,
  }],
  experience: [{
    company: String,
    designation: String,
    from: Date,
    to: Date,
    description: String,
  }],
  skills: [String],
  certifications: [{
    name: String,
    issuedBy: String,
    issuedAt: Date,
    expiresAt: Date,
    documentUrl: String,
  }],

  // Documents
  documents: [{
    type: String,
    name: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now },
  }],

  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  metadata: { type: Object, default: {} },
}, { timestamps: true });

employeeSchema.index({ tenantId: 1, employeeId: 1 }, { unique: true });
employeeSchema.index({ tenantId: 1, officialEmail: 1 }, { unique: true });
employeeSchema.index({ tenantId: 1, managerId: 1 });
employeeSchema.index({ tenantId: 1, departmentId: 1 });
employeeSchema.index({ tenantId: 1, status: 1 });
employeeSchema.index(
  { tenantId: 1, firstName: 'text', lastName: 'text', employeeId: 'text', officialEmail: 'text' },
);

module.exports = mongoose.model('Employee', employeeSchema);
