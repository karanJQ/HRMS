const { query } = require('../config/database');
const { success, error } = require('../utils/response');
const { sendAnnouncementEmail } = require('../utils/mailer');

exports.list = async (req, res) => {
  try {
    const result = await query(
      `SELECT a.*, u.username as creator_name, e.first_name, e.last_name
       FROM announcements a 
       LEFT JOIN users u ON a.created_by = u.id
       LEFT JOIN employees e ON u.emp_id = e.emp_id
       ORDER BY a.created_at DESC
       LIMIT 50`
    );
    
    // Format creator name
    const data = result.rows.map(row => {
      let creator = 'Admin';
      if (row.first_name) {
        creator = `${row.first_name} ${row.last_name || ''}`.trim();
      } else if (row.creator_name) {
        creator = row.creator_name;
      }
      return {
        ...row,
        creator_name: creator
      };
    });

    return success(res, data);
  } catch (err) { 
    return error(res, err.message); 
  }
};

exports.create = async (req, res) => {
  const { title, type, content, sendMail } = req.body;
  
  if (!title || !type || !content) {
    return error(res, 'Title, type, and content are required.', 400);
  }

  try {
    const userId = req.user.id; // From requireAuth middleware

    const result = await query(
      'INSERT INTO announcements(title, type, content, created_by) VALUES($1, $2, $3, $4) RETURNING *',
      [title, type, content, userId]
    );

    const announcement = result.rows[0];

    // If sendMail flag is true, fetch all active employee emails and send notification
    if (sendMail) {
      const emailResult = await query(
        `SELECT official_email FROM employees WHERE status = 'Active' AND official_email IS NOT NULL AND official_email != ''`
      );
      const emailList = emailResult.rows.map(row => row.official_email);

      if (emailList.length > 0) {
        // Format date as DD/MM/YYYY
        const d = new Date();
        const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        
        // Dispatch email asynchronously so it doesn't block the API response
        sendAnnouncementEmail(emailList, title, content, dateStr).catch(err => {
          console.error('Failed to send announcement email in background:', err);
        });
      }
    }

    return success(res, announcement, 'Announcement created', 201);
  } catch (err) {
    return error(res, err.message);
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query('DELETE FROM announcements WHERE id = $1 RETURNING *', [id]);
    
    if (result.rowCount === 0) {
      return error(res, 'Announcement not found', 404);
    }
    
    return success(res, null, 'Announcement deleted successfully');
  } catch (err) {
    return error(res, err.message);
  }
};
