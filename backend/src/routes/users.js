const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateUserUpdate } = require('../middleware/validation');

// @route   GET /api/users
// @desc    Get all users (admin only)
// @access  Private (Admin)
router.get('/', authenticate, authorize(['ADMIN']), userController.getAllUsers);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (Admin or self)
router.get('/:id', authenticate, userController.getUserById);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Admin or self)
router.put('/:id', authenticate, validateUserUpdate, userController.updateUser);

// @route   DELETE /api/users/:id
// @desc    Delete user (admin only)
// @access  Private (Admin)
router.delete('/:id', authenticate, authorize(['ADMIN']), userController.deleteUser);

// @route   GET /api/users/:id/activity
// @desc    Get user activity log
// @access  Private (Admin or self)
router.get('/:id/activity', authenticate, userController.getUserActivity);

module.exports = router;
