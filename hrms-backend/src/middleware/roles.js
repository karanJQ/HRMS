const { error } = require('../utils/response');

/**
 * Middleware to allow only Admin or HR roles to access certain routes.
 * Assumes that the authentication middleware has already populated req.user.
 */
const isAdminOrHR = (req, res, next) => {
  const role = req.user && req.user.role;
  if (['super_admin', 'hr_manager', 'hr_staff'].includes(role)) {
    return next();
  }
  return error(res, 'Forbidden: Admin or HR role required', 403);
};

module.exports = { isAdminOrHR };
