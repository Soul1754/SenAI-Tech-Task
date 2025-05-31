const express = require('express');
const router = express.Router();
const ResumeController = require('../controllers/resumeController');
const { authenticate, authorize } = require('../middleware/auth');

// @route   POST /api/resumes/upload
// @desc    Upload resume file
// @access  Private
router.post('/upload', 
  authenticate, 
  ResumeController.uploadResume
);

// @route   GET /api/resumes
// @desc    Get all resumes with filtering and pagination
// @access  Private
router.get('/', authenticate, ResumeController.getAllResumes);

// @route   GET /api/resumes/:id
// @desc    Get resume by ID
// @access  Private
router.get('/:id', authenticate, ResumeController.getResumeById);

// @route   PUT /api/resumes/:id
// @desc    Update resume metadata
// @access  Private
router.put('/:id', authenticate, ResumeController.updateResume);

// @route   DELETE /api/resumes/:id
// @desc    Delete resume
// @access  Private
router.delete('/:id', authenticate, ResumeController.deleteResume);

// @route   POST /api/resumes/:id/process
// @desc    Trigger resume processing
// @access  Private
router.post('/:id/process', authenticate, ResumeController.processResume);

module.exports = router;
