const Tenant = require('../models/Tenant');
const logger = require('../config/logger');

// ─── Tenant Cache (simple in-memory, 5 min TTL) ──────────────────────────
const tenantCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getTenantCached(tenantId) {
  const cached = tenantCache.get(tenantId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  const tenant = await Tenant.findOne({ tenantId }).lean();
  if (tenant) {
    tenantCache.set(tenantId, { data: tenant, timestamp: Date.now() });
  }
  return tenant;
}

// ─── Core Tenant Isolation Middleware ─────────────────────────────────────
// Must run AFTER the `protect` middleware (which sets req.tenantId from JWT).
//
// What it does:
// 1. Ensures the tenant exists in the database.
// 2. Blocks requests if the tenant is suspended or cancelled.
// 3. Prevents header-based tenantId spoofing — the tenantId ONLY comes from
//    the JWT, never from request headers or body.
// 4. Attaches the full tenant object to req.tenant for downstream use.
const ensureTenantIsolation = async (req, res, next) => {
  const tenantId = req.tenantId;

  if (!tenantId) {
    return res.status(401).json({
      success: false,
      message: 'Tenant context is missing. Please log in again.',
    });
  }

  // SECURITY: Reject if the client tries to override tenantId via header
  const headerTenantId = req.headers['x-tenant-id'];
  if (headerTenantId && headerTenantId !== tenantId) {
    logger.warn(`Tenant spoofing attempt: JWT tenantId=${tenantId}, header x-tenant-id=${headerTenantId}, userId=${req.user?.id}`);
    return res.status(403).json({
      success: false,
      message: 'Access denied. Tenant mismatch detected.',
    });
  }

  // Validate the tenant exists and is active
  try {
    const tenant = await getTenantCached(tenantId);

    if (!tenant) {
      logger.warn(`Request for non-existent tenant: ${tenantId}, userId=${req.user?.id}`);
      return res.status(403).json({
        success: false,
        message: 'Your organization is not found. Please contact support.',
      });
    }

    if (tenant.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your organization account has been suspended. Please contact your administrator.',
      });
    }

    if (tenant.status === 'cancelled') {
      return res.status(403).json({
        success: false,
        message: 'Your organization account has been cancelled.',
      });
    }

    // Check trial expiry
    if (tenant.status === 'trial' && tenant.trialEndsAt && new Date(tenant.trialEndsAt) < new Date()) {
      return res.status(403).json({
        success: false,
        message: 'Your trial period has expired. Please upgrade your plan to continue.',
      });
    }

    // Attach tenant to request for downstream use
    req.tenant = tenant;

    next();
  } catch (err) {
    logger.error(`Tenant validation error: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during tenant validation.',
    });
  }
};

// ─── Scope Query Helper ──────────────────────────────────────────────────
// Use this in controllers to enforce tenant scoping on all DB queries:
//   const query = req.scopeQuery({ status: 'active' });
//   // => { tenantId: 'abc', status: 'active' }
const attachScopeHelper = (req, res, next) => {
  req.scopeQuery = (additionalFilters = {}) => ({
    tenantId: req.tenantId,
    ...additionalFilters,
  });
  next();
};

// ─── Clear cache entry (call when tenant is updated) ─────────────────────
function invalidateTenantCache(tenantId) {
  tenantCache.delete(tenantId);
}

module.exports = {
  ensureTenantIsolation,
  attachScopeHelper,
  invalidateTenantCache,
};
