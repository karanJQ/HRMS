const { query } = require('../config/database');
const { success, error } = require('../utils/response');

// List notifications for logged-in user (newest first, limit 50)
exports.listNotifications = async (req, res) => {
  try {
    const result = await query(
      `SELECT n.*, t.title AS task_title, t.status AS task_status
       FROM notifications n
       LEFT JOIN tasks t ON t.id = n.ref_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    return success(res, result.rows, 'Notifications fetched');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

// Get unread count
exports.getUnreadCount = async (req, res) => {
  try {
    const result = await query(
      'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );
    return success(res, { count: result.rows[0].count });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

// Mark single notification as read
exports.markRead = async (req, res) => {
  try {
    const result = await query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );
    if (result.rowCount === 0) return error(res, 'Notification not found', 404);
    return success(res, result.rows[0], 'Marked as read');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

// Mark all notifications as read
exports.markAllRead = async (req, res) => {
  try {
    await query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );
    return success(res, null, 'All notifications marked as read');
  } catch (err) {
    return error(res, err.message, 500);
  }
};
