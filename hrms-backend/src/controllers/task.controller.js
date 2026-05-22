const { query } = require('../config/database');
const { success, error } = require('../utils/response');

// ── Helper: create a notification ─────────────────────
const notify = async (userId, type, title, message, refId) => {
  try {
    await query(
      `INSERT INTO notifications (user_id, type, title, message, ref_id) VALUES ($1,$2,$3,$4,$5)`,
      [userId, type, title, message, refId]
    );
  } catch (err) {
    console.error('Notification insert error:', err.message);
  }
};

// ── List Tasks ────────────────────────────────────────
exports.listTasks = async (req, res) => {
  try {
    const isAdmin = ['super_admin', 'hr_manager', 'dept_head'].includes(req.user.role);
    const baseQuery = `
      SELECT t.*,
        creator.first_name || ' ' || creator.last_name AS creator_name,
        cu.username AS creator_username,
        assignee.first_name || ' ' || assignee.last_name AS assignee_name,
        au.username AS assignee_username,
        au.email AS assignee_email,
        CASE WHEN t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE AND t.status != 'Done' THEN true ELSE false END AS is_overdue,
        CASE WHEN t.due_date IS NOT NULL THEN t.due_date - CURRENT_DATE ELSE NULL END AS days_remaining
      FROM tasks t
      LEFT JOIN users cu ON cu.id = t.created_by
      LEFT JOIN employees creator ON creator.emp_id = cu.emp_id
      LEFT JOIN users au ON au.id = t.assigned_to
      LEFT JOIN employees assignee ON assignee.emp_id = au.emp_id
    `;

    let result;
    if (isAdmin) {
      result = await query(`${baseQuery} ORDER BY t.created_at DESC`);
    } else {
      result = await query(
        `${baseQuery} WHERE t.assigned_to = $1 OR t.created_by = $1 ORDER BY t.created_at DESC`,
        [req.user.id]
      );
    }
    return success(res, result.rows, 'Tasks fetched successfully');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

// ── Task Stats ────────────────────────────────────────
exports.getTaskStats = async (req, res) => {
  try {
    const isAdmin = ['super_admin', 'hr_manager', 'dept_head'].includes(req.user.role);
    const whereClause = isAdmin ? '' : 'WHERE t.assigned_to = $1 OR t.created_by = $1';
    const params = isAdmin ? [] : [req.user.id];

    const result = await query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE t.status = 'Todo')::int AS todo,
        COUNT(*) FILTER (WHERE t.status = 'In Progress')::int AS in_progress,
        COUNT(*) FILTER (WHERE t.status = 'In Review')::int AS in_review,
        COUNT(*) FILTER (WHERE t.status = 'Done')::int AS done,
        COUNT(*) FILTER (WHERE t.due_date < CURRENT_DATE AND t.status != 'Done')::int AS overdue,
        COUNT(*) FILTER (WHERE t.due_date = CURRENT_DATE AND t.status != 'Done')::int AS due_today
      FROM tasks t
      ${whereClause}
    `, params);

    return success(res, result.rows[0]);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

// ── Create Task ───────────────────────────────────────
exports.createTask = async (req, res) => {
  const { title, description, assigned_to, status, priority, due_date } = req.body;
  if (!title) return error(res, 'Title is required', 400);

  try {
    const result = await query(
      `INSERT INTO tasks (title, description, assigned_to, created_by, status, priority, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, description || null, assigned_to || null, req.user.id, status || 'Todo', priority || 'Medium', due_date || null]
    );

    const task = result.rows[0];

    // Notify the assignee if assigned to someone other than the creator
    if (assigned_to && parseInt(assigned_to) !== req.user.id) {
      const dueDateStr = due_date ? ` — Due: ${new Date(due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : '';
      await notify(
        assigned_to,
        'TASK_ASSIGNED',
        'New Task Assigned',
        `You have been assigned: "${title}"${dueDateStr}`,
        task.id
      );
    }

    return success(res, task, 'Task created successfully', 201);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

// ── Update Task (full) ───────────────────────────────
exports.updateTask = async (req, res) => {
  const { id } = req.params;
  const { title, description, assigned_to, status, priority, due_date } = req.body;

  try {
    // Get old task to detect reassignment
    const oldResult = await query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (oldResult.rowCount === 0) return error(res, 'Task not found', 404);
    const oldTask = oldResult.rows[0];

    const completed_at = status === 'Done' ? new Date() : (status && status !== 'Done' ? null : oldTask.completed_at);

    const result = await query(
      `UPDATE tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        assigned_to = $3,
        status = COALESCE($4, status),
        priority = COALESCE($5, priority),
        due_date = $6,
        completed_at = $7,
        updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [title, description, assigned_to || oldTask.assigned_to, status, priority, due_date || oldTask.due_date, completed_at, id]
    );

    const task = result.rows[0];

    // Notify if reassigned to a different person
    if (assigned_to && parseInt(assigned_to) !== oldTask.assigned_to && parseInt(assigned_to) !== req.user.id) {
      const dueDateStr = task.due_date ? ` — Due: ${new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : '';
      await notify(
        assigned_to,
        'TASK_ASSIGNED',
        'Task Assigned to You',
        `You have been assigned: "${task.title}"${dueDateStr}`,
        task.id
      );
    }

    // Notify assignee if status changed (and assignee is not the updater)
    if (status && status !== oldTask.status && task.assigned_to && task.assigned_to !== req.user.id) {
      await notify(
        task.assigned_to,
        'TASK_UPDATED',
        'Task Status Updated',
        `Task "${task.title}" has been moved to ${status}`,
        task.id
      );
    }

    // Notify creator if task completed by someone else
    if (status === 'Done' && task.created_by !== req.user.id) {
      await notify(
        task.created_by,
        'TASK_COMPLETED',
        'Task Completed',
        `Task "${task.title}" has been marked as Done`,
        task.id
      );
    }

    return success(res, task, 'Task updated');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

// ── Update Task Status (quick) ───────────────────────
exports.updateTaskStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) return error(res, 'Status is required', 400);

  try {
    const completed_at = status === 'Done' ? new Date() : null;
    const result = await query(
      `UPDATE tasks SET status = $1, completed_at = COALESCE($2, completed_at), updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, completed_at, id]
    );
    if (result.rowCount === 0) return error(res, 'Task not found', 404);

    const task = result.rows[0];

    // Notify creator if task completed by assignee
    if (status === 'Done' && task.created_by !== req.user.id) {
      await notify(
        task.created_by,
        'TASK_COMPLETED',
        'Task Completed',
        `Task "${task.title}" has been marked as Done`,
        task.id
      );
    }

    return success(res, task, 'Task status updated');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

// ── Delete Task ──────────────────────────────────────
exports.deleteTask = async (req, res) => {
  const { id } = req.params;
  try {
    // Only creator or admin can delete
    const isAdmin = ['super_admin', 'hr_manager'].includes(req.user.role);
    const whereClause = isAdmin ? 'WHERE id = $1' : 'WHERE id = $1 AND created_by = $2';
    const params = isAdmin ? [id] : [id, req.user.id];

    const result = await query(`DELETE FROM tasks ${whereClause} RETURNING id`, params);
    if (result.rowCount === 0) return error(res, 'Task not found or not authorized', 404);

    // Clean up notifications related to this task
    await query('DELETE FROM notifications WHERE ref_id = $1', [id]);

    return success(res, null, 'Task deleted');
  } catch (err) {
    return error(res, err.message, 500);
  }
};
