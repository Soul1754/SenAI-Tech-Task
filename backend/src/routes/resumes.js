const express = require('express');
const router = express.Router();
const ResumeController = require('../controllers/resumeController');
const { authenticate, authorize } = require('../middleware/auth');
const { upload, validateFile } = require('../middleware/upload');

// @route   POST /api/resumes/upload
// @desc    Upload resume file
// @access  Private
router.post('/upload', 
  authenticate,
  upload,
  validateFile,
  ResumeController.uploadResume
);

// @route   GET /api/resumes/:id/status
// @desc    Get processing status for a resume
// @access  Private
router.get('/:id/status', authenticate, ResumeController.getProcessingStatus);

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

// @route   POST /api/resumes/test-llm-extraction
// @desc    Test LLM extraction on provided text
// @access  Private
router.post('/test-llm-extraction', authenticate, ResumeController.testLLMExtraction);

// @route   GET /api/resumes/llm-status
// @desc    Get LLM service status and capabilities
// @access  Private
router.get('/llm-status', authenticate, ResumeController.getLLMStatus);

module.exports = router;
