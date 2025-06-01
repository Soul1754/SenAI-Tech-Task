const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const userRoutes = require('./users');
const resumeRoutes = require('./resumes');
const candidateRoutes = require('./candidates');
const jobRoutes = require('./jobs');
const skillRoutes = require('./skills');
const shortlistRoutes = require('./shortlists');
const llmRoutes = require('./llm');

// API root
router.get('/', (req, res) => {
  res.json({
    message: 'Resume Processing System API v1.0',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      resumes: '/api/resumes',
      candidates: '/api/candidates',
      jobs: '/api/jobs',
      skills: '/api/skills',
      shortlists: '/api/shortlists',
      llm: '/api/llm',
    },
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/resumes', resumeRoutes);
router.use('/candidates', candidateRoutes);
router.use('/jobs', jobRoutes);
router.use('/skills', skillRoutes);
router.use('/shortlists', shortlistRoutes);
router.use('/llm', llmRoutes);

module.exports = router;
