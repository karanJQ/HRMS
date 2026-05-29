const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/authorize');
const documentController = require('../controllers/document.controller');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

router.use(auth);

// Upload a document
router.post('/upload', allow('super_admin', 'hr_manager', 'hr_staff', 'employee'), upload.single('file'), documentController.uploadDocument);

// Get documents for an owner
router.get('/:owner_id', allow('super_admin', 'hr_manager', 'hr_staff', 'dept_head', 'employee'), documentController.getDocuments);

// Trigger OCR on a document
router.post('/:id/ocr', allow('super_admin', 'hr_manager', 'hr_staff'), documentController.performOCR);

// Update extracted data
router.put('/:id/data', allow('super_admin', 'hr_manager', 'hr_staff'), documentController.updateData);

// Delete a document
router.delete('/:id', allow('super_admin', 'hr_manager', 'hr_staff', 'employee'), documentController.deleteDocument);

module.exports = router;
