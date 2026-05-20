const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { success, error } = require('../utils/response');

const signToken = (user) =>
  jwt.sign(
    { id: user.id, emp_id: user.emp_id, role: user.role, dept_id: user.dept_id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return error(res, 'Email and password required.', 400);
  try {
    const result = await query(
      `SELECT u.*, d.name as dept_name FROM users u
       LEFT JOIN departments d ON d.id = u.dept_id
       WHERE u.email = $1 AND u.is_active = true`, [email]
    );
    if (!result.rows.length) return error(res, 'Invalid credentials.', 401);
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return error(res, 'Invalid credentials.', 401);

    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = signToken(user);
    const { password_hash, ...userData } = user;
    return success(res, { token, user: userData }, 'Login successful');
  } catch (err) {
    return error(res, 'Login failed. ' + err.message);
  }
};

exports.me = async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.emp_id, u.username, u.email, u.role, u.dept_id, u.last_login,
              d.name as dept_name,
              e.first_name, e.last_name, e.mobile, e.profile_photo_url
       FROM users u
       LEFT JOIN departments d ON d.id = u.dept_id
       LEFT JOIN employees e ON e.emp_id = u.emp_id
       WHERE u.id = $1`, [req.user.id]
    );
    if (!result.rows.length) return error(res, 'User not found.', 404);
    return success(res, result.rows[0]);
  } catch (err) {
    return error(res, err.message);
  }
};

exports.changePassword = async (req, res) => {
  const { old_password, new_password } = req.body;
  if (!old_password || !new_password) return error(res, 'Both passwords required.', 400);
  if (new_password.length < 8) return error(res, 'Password must be at least 8 characters.', 400);
  try {
    const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];
    const valid = await bcrypt.compare(old_password, user.password_hash);
    if (!valid) return error(res, 'Current password is incorrect.', 401);
    const hash = await bcrypt.hash(new_password, 12);
    await query('UPDATE users SET password_hash=$1, must_change_pw=false, updated_at=NOW() WHERE id=$2', [hash, req.user.id]);
    return success(res, null, 'Password changed successfully');
  } catch (err) {
    return error(res, err.message);
  }
};

exports.createUser = async (req, res) => {
  const { username, email, password, role, dept_id, emp_id } = req.body;
  if (!username || !email || !password || !role) return error(res, 'username, email, password, role required.', 400);
  try {
    const hash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users(username,email,password_hash,role,dept_id,emp_id,must_change_pw)
       VALUES($1,$2,$3,$4,$5,$6,true) RETURNING id,username,email,role,dept_id,emp_id`,
      [username, email, hash, role, dept_id || null, emp_id || null]
    );
    return success(res, result.rows[0], 'User created successfully', 201);
  } catch (err) {
    if (err.code === '23505') return error(res, 'Username or email already exists.', 409);
    return error(res, err.message);
  }
};

exports.listUsers = async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.emp_id, u.username, u.email, u.role, u.is_active, u.last_login, u.created_at,
              d.name as dept_name
       FROM users u LEFT JOIN departments d ON d.id = u.dept_id
       ORDER BY u.created_at DESC`
    );
    return success(res, result.rows);
  } catch (err) {
    return error(res, err.message);
  }
};

exports.toggleUser = async (req, res) => {
  try {
    const result = await query(
      'UPDATE users SET is_active = NOT is_active WHERE id=$1 RETURNING id, is_active', [req.params.id]
    );
    return success(res, result.rows[0]);
  } catch (err) {
    return error(res, err.message);
  }
};