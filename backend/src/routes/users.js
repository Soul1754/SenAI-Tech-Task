const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

// @route   GET /api/users
// @desc    Get all users (admin only)
// @access  Private (Admin)
router.get('/', authenticate, authorize('ADMIN'), UserController.getAllUsers);

// @route   POST /api/users
// @desc    Create new user (admin only)
// @access  Private (Admin)
router.post('/', authenticate, authorize('ADMIN'), UserController.createUser);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (Admin or self)
router.get('/:id', authenticate, UserController.getUserById);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Admin or self)
router.put('/:id', authenticate, UserController.updateUser);

// @route   DELETE /api/users/:id
// @desc    Delete user (admin only)
// @access  Private (Admin)
router.delete('/:id', authenticate, authorize('ADMIN'), UserController.deleteUser);

// @route   PUT /api/users/:id/activate
// @desc    Activate user (admin only)
// @access  Private (Admin)
router.put('/:id/activate', authenticate, authorize('ADMIN'), UserController.activateUser);

// @route   PUT /api/users/:id/reset-password
// @desc    Reset user password (admin only)
// @access  Private (Admin)
router.put('/:id/reset-password', authenticate, authorize('ADMIN'), UserController.resetPassword);

module.exports = router;
