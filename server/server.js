require('dotenv').config({ path: require('path').join(__dirname, '.env') });
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const path = require('path');
const connectDB = require('./src/config/database');
const logger = require('./src/config/logger');
const { errorHandler, notFound } = require('./src/middleware/error.middleware');
const { ensureTenantIsolation, attachScopeHelper } = require('./src/middleware/tenant.middleware');
const { protect } = require('./src/middleware/auth.middleware');

// Route imports
const authRoutes = require('./src/routes/auth.routes');
const tenantRoutes = require('./src/routes/tenant.routes');
const employeeRoutes = require('./src/routes/employee.routes');
const organizationRoutes = require('./src/routes/organization.routes');
const attendanceRoutes = require('./src/routes/attendance.routes');
const leaveRoutes = require('./src/routes/leave.routes');
const workflowRoutes = require('./src/routes/workflow.routes');
const notificationRoutes = require('./src/routes/notification.routes');
const reportingRoutes = require('./src/routes/reporting.routes');
const auditRoutes = require('./src/routes/audit.routes');
const roleRoutes = require('./src/routes/role.routes');
const payslipRoutes = require('./src/routes/payslip.routes');
const noticeRoutes = require('./src/routes/notice.routes');

const app = express();

// ─── Connect Database ──────────────────────────────────────────────────────
connectDB();

// ─── Security Middleware ───────────────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
}));

// ─── Rate Limiting ─────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.THROTTLE_LIMIT) || 5000, // Very high limit for HR/Admin bulk tasks
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Allow high volume of testing/account creation without getting blocked
  message: { success: false, message: 'Too many login attempts, account temporarily locked.' },
});

app.use(globalLimiter);

// Serve uploads statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/video', express.static(path.join(__dirname, '..', 'video')));

// (Static frontend files handled by Express v5 block below)

// ─── Body Parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Request Logging ───────────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));

// ─── Health Check ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// ─── API Routes ────────────────────────────────────────────────────────────
const API = '/api/v1';

// Public routes — auth & tenant registration handle tenant validation internally
app.use(`${API}/auth`, authLimiter, authRoutes);
app.use(`${API}/tenants`, tenantRoutes);

// Protected routes — enforce tenant isolation on every request
// Users from one tenant can NEVER access another tenant's data
app.use(`${API}/employees`, protect, ensureTenantIsolation, attachScopeHelper, employeeRoutes);
app.use(`${API}/organization`, protect, ensureTenantIsolation, attachScopeHelper, organizationRoutes);
app.use(`${API}/attendance`, protect, ensureTenantIsolation, attachScopeHelper, attendanceRoutes);
app.use(`${API}/leave`, protect, ensureTenantIsolation, attachScopeHelper, leaveRoutes);
app.use(`${API}/workflow`, protect, ensureTenantIsolation, attachScopeHelper, workflowRoutes);
app.use(`${API}/notifications`, protect, ensureTenantIsolation, attachScopeHelper, notificationRoutes);
app.use(`${API}/reports`, protect, ensureTenantIsolation, attachScopeHelper, reportingRoutes);
app.use(`${API}/audit`, protect, ensureTenantIsolation, attachScopeHelper, auditRoutes);
app.use(`${API}/roles`, protect, ensureTenantIsolation, attachScopeHelper, roleRoutes);
app.use(`${API}/payslips`, protect, ensureTenantIsolation, attachScopeHelper, payslipRoutes);
app.use(`${API}/notices`, protect, ensureTenantIsolation, attachScopeHelper, noticeRoutes);

const buildPath = path.resolve(__dirname, '../client/dist')
//5. static file serving & SPA Routing
//serve static files from the build directory
app.use(express.static(buildPath));

// express v4 wildcard route
app.get('*', (req, res, next) => {
  // Let API routes fall through to the JSON notFound error handler
  if (req.path.startsWith('/api/') || req.path === '/health') return next();

  res.sendFile(path.join(buildPath, 'index.html'), (err) => {
    if (err) {
      //if index.html is missing, this provide a clearer error
      res.status(500).send("Build file index.html not found. ensure you ran 'npm run build'")
    }
  })
})

// ─── Error Handling ────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`🚀 HRMS Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  logger.info(`🔗 Local URL: http://localhost:${PORT}`);
});

module.exports = app;
