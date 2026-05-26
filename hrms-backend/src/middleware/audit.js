const { query } = require('../config/database');

exports.logAudit = (action, entity) => {
  return async (req, res, next) => {
    // We capture the original send/json methods to log only on success, or we log right away.
    // Logging right away for simplicity of audit trailing the attempt.
    const userId = req.user ? req.user.id : null;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    try {
      let entityId = null;
      if (req.params && req.params.id) entityId = req.params.id;
      
      const details = {
        method: req.method,
        url: req.originalUrl,
        body: req.method !== 'GET' ? req.body : null
      };

      // Clean up passwords from logs
      if (details.body && details.body.password) {
        details.body.password = '***';
      }

      await query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip_address) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, action, entity, entityId, JSON.stringify(details), ipAddress]
      );
    } catch (err) {
      console.error('Audit Log Error:', err);
    }

    next();
  };
};
