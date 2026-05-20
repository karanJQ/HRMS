const jwt = require('jsonwebtoken');
const { error } = require('../utils/response');

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return error(res, 'Access denied. No token.', 401);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return error(res, 'Invalid or expired token.', 401);
  }
};