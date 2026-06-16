const AuditLog = require('../models/AuditLog');

const auditLog = (module, action) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (data) {
      // Only log successful responses
      if (res.statusCode < 400 && req.user) {
        AuditLog.create({
          tenantId: req.tenantId || req.user?.tenantId,
          userId: req.user?.id,
          userEmail: req.user?.email,
          module,
          action,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          metadata: {
            method: req.method,
            url: req.originalUrl,
            body: req.body,
            params: req.params,
          },
        }).catch(() => {}); // Fire-and-forget — never block response
      }
      return originalJson(data);
    };
    next();
  };
};

module.exports = { auditLog };
