const router = require('express').Router();
const ctrl = require('../controllers/announcement.controller');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/authorize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

router.get('/', auth, ctrl.list);
router.post('/', auth, allow('super_admin', 'hr_manager', 'hr_staff'), upload.array('images', 5), ctrl.create);
router.put('/:id', auth, allow('super_admin', 'hr_manager', 'hr_staff'), upload.array('images', 5), ctrl.update);
router.delete('/:id', auth, allow('super_admin', 'hr_manager', 'hr_staff'), ctrl.delete);

module.exports = router;
