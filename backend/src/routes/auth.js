const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateLogin, validateRegister } = require('../middleware/validation');

// @route   POST /api/auth/login
// @desc    Authenticate user and return JWT token
// @access  Public
router.post('/login', validateLogin, authController.login);

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public (can be restricted to admin in production)
router.post('/register', validateRegister, authController.register);

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', authController.refreshToken);

// @route   POST /api/auth/logout
// @desc    Logout user (invalidate token)
// @access  Private
router.post('/logout', authController.logout);

// @route   GET /api/auth/me
// @desc    Get current user info
// @access  Private
router.get('/me', authController.getCurrentUser);

module.exports = router;
