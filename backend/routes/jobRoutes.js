// O:\JobConnector\backend\routes\jobRoutes.js
const express = require('express');
const { 
  postJob,
  searchJobs,
  getAppliedJobsBySeeker, 
  sendWhatsAppMessage, 
  getTrendingSkills, 
  sendMassEmail, 
  searchSeekers, 
  uploadExcel,
  deleteSeeker,
  deleteJob,
  saveSearch,
  applyToJob, 
  getApplicants,
  updateJob, // Added updateJob
  updateSeekerProfile, // Added updateSeekerProfile
  toggleJobAvailability,
  authenticateProvider,
} = require('../controllers/jobController');
const multer = require('multer');

const upload = multer({ dest: 'uploads/' });
const router = express.Router();

// Existing routes
router.post('/post', postJob);
router.get('/search', searchJobs);
router.post('/whatsapp', sendWhatsAppMessage);
router.get('/trending-skills', getTrendingSkills);
router.post('/mass-email', sendMassEmail);
router.get('/seekers', searchSeekers);
router.post('/upload-excel', upload.single('file'), uploadExcel);
router.post('/delete-seeker', deleteSeeker);
router.post('/delete-job', deleteJob);
router.post('/save-search', saveSearch);
router.post('/apply', applyToJob);

// Updated routes for mobile app compatibility
router.get('/posted', async (req, res) => {
  try {
    const jobs = await searchJobs({ postedBy: req.user?._id });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching posted jobs', error: error.message });
  }
});

router.post('/delete', deleteJob);
router.post('/apply-job', applyToJob);
router.get('/applicants', getApplicants);
router.get('/get/appliedfor', getAppliedJobsBySeeker);
// router.post('/change/availibility', toggleJobAvailability)
router.post('/change/availibility/:jobId', toggleJobAvailability);
// New routes for updating jobs and seekers
router.post('/update-job', updateJob);
router.post('/update-seeker', updateSeekerProfile);
// router.post('/save-fcm-token',authenticateProvider);


module.exports = router;