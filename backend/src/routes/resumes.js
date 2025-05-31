const express = require('express');
const router = express.Router();
const resumeController = require('../controllers/resumeController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadMiddleware } = require('../middleware/upload');
const { validateResumeUpload } = require('../middleware/validation');

// @route   POST /api/resumes/upload
// @desc    Upload resume file
// @access  Private
router.post('/upload', 
  authenticate, 
  uploadMiddleware.single('resume'), 
  validateResumeUpload, 
  resumeController.uploadResume
);

// @route   GET /api/resumes
// @desc    Get all resumes with filtering and pagination
// @access  Private
router.get('/', authenticate, resumeController.getAllResumes);

// @route   GET /api/resumes/:id
// @desc    Get resume by ID
// @access  Private
router.get('/:id', authenticate, resumeController.getResumeById);

// @route   PUT /api/resumes/:id
// @desc    Update resume metadata
// @access  Private
router.put('/:id', authenticate, resumeController.updateResume);

// @route   DELETE /api/resumes/:id
// @desc    Delete resume
// @access  Private
router.delete('/:id', authenticate, resumeController.deleteResume);

// @route   POST /api/resumes/:id/process
// @desc    Trigger resume processing
// @access  Private
router.post('/:id/process', authenticate, resumeController.processResume);

// @route   GET /api/resumes/:id/status
// @desc    Get resume processing status
// @access  Private
router.get('/:id/status', authenticate, resumeController.getProcessingStatus);

// @route   GET /api/resumes/:id/download
// @desc    Download original resume file
// @access  Private
router.get('/:id/download', authenticate, resumeController.downloadResume);

// @route   GET /api/resumes/:id/text
// @desc    Get extracted text from resume
// @access  Private
router.get('/:id/text', authenticate, resumeController.getExtractedText);

module.exports = router;
