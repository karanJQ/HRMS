const { error } = require('../utils/response');

// Role hierarchy
const ROLES = {
  super_admin: 5,
  hr_manager: 4,
  dept_head: 3,
  hr_staff: 2,
  employee: 1,
};

// Allow specific roles
const allow = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return error(res, 'Access denied. Insufficient permissions.', 403);
  }
  next();
};

// Allow minimum role level
const minRole = (role) => (req, res, next) => {
  if ((ROLES[req.user.role] || 0) < (ROLES[role] || 0)) {
    return error(res, 'Access denied. Insufficient permissions.', 403);
  }
  next();
};

// Allow employee to access own data or higher roles to access any
const selfOrRole = (...roles) => (req, res, next) => {
  const isOwn = req.user.emp_id && req.params.empId === req.user.emp_id;
  const hasRole = roles.includes(req.user.role);
  if (!isOwn && !hasRole) {
    return error(res, 'Access denied.', 403);
  }
  next();
};

module.exports = { allow, minRole, selfOrRole, ROLES };