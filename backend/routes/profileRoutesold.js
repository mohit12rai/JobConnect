const express = require('express');
const multer = require('multer');
const path = require('path');
const { createSeekerProfile, createProviderProfile, updateSeekerProfile, updateProviderProfile, getProfile } = require('../controllers/profileController');

const router = express.Router();

// Multer setup with custom storage
const storage = multer.diskStorage({
  destination: 'uploads/', // Ensure this directory exists or is created
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /pdf|doc|docx/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOC/DOCX files are allowed!'));
    }
  },
});

// Routes
router.get('/get-profile', getProfile); // Changed from '/' to '/get-profile' for clarity
router.post('/seeker', upload.single('resume'), createSeekerProfile); // Create seeker with resume upload
router.post('/provider', createProviderProfile); // Create provider (no file upload needed)
router.post('/seeker/update', upload.single('resume'), updateSeekerProfile); // Update seeker with resume upload
router.post('/provider/update', updateProviderProfile); // Update provider (no file upload needed)

module.exports = router;