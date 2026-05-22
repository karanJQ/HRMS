const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notification.controller');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/',            ctrl.listNotifications);
router.get('/unread',      ctrl.getUnreadCount);
router.put('/read-all',    ctrl.markAllRead);
router.put('/:id/read',    ctrl.markRead);

module.exports = router;
