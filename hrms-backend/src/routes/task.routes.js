const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const auth = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

router.use(auth);

router.get('/',             taskController.listTasks);
router.get('/stats',        taskController.getTaskStats);
router.post('/',            logAudit('CREATE_TASK', 'Tasks'),        taskController.createTask);
router.put('/:id',          logAudit('UPDATE_TASK', 'Tasks'),        taskController.updateTask);
router.put('/:id/status',   logAudit('UPDATE_TASK_STATUS', 'Tasks'), taskController.updateTaskStatus);
router.delete('/:id',       logAudit('DELETE_TASK', 'Tasks'),        taskController.deleteTask);

module.exports = router;
