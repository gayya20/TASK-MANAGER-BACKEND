const express = require('express');
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  updateTaskCompletion
} = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Routes accessible by both admin and users
router.get('/', getTasks);
router.get('/:id', getTask);
router.put('/:id/completion', updateTaskCompletion);

// Admin only routes
router.post('/', authorize('admin'), createTask);
router.put('/:id', authorize('admin'), updateTask);
router.delete('/:id', authorize('admin'), deleteTask);

module.exports = router;