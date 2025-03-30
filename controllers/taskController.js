const Task = require('../models/Task');
const User = require('../models/User');

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res) => {
  try {
    let query;
    
    // Copy req.query
    const reqQuery = { ...req.query };
    
    // Fields to exclude from filtering
    const removeFields = ['sort', 'page', 'limit'];
    
    // Remove fields from reqQuery
    removeFields.forEach(param => delete reqQuery[param]);
    
    // Create query string
    let queryStr = JSON.stringify(reqQuery);
    
    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    // Find tasks based on role
    if (req.user.role === 'admin') {
      // Admin can view all tasks
      query = Task.find(JSON.parse(queryStr));
    } else {
      // Regular user can only view assigned tasks
      query = Task.find({
        ...JSON.parse(queryStr),
        assignedTo: req.user.id
      });
    }
    
    // Add population
    query = query.populate({
      path: 'assignedTo',
      select: 'firstName lastName email'
    }).populate({
      path: 'createdBy',
      select: 'firstName lastName email'
    });
    
    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Task.countDocuments(query);
    
    query = query.skip(startIndex).limit(limit);
    
    // Execute query
    const tasks = await query;
    
    // Pagination result
    const pagination = {};
    
    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }
    
    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }
    
    res.status(200).json({
      success: true,
      count: tasks.length,
      pagination,
      data: tasks
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message
    });
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
exports.getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate({
        path: 'assignedTo',
        select: 'firstName lastName email'
      })
      .populate({
        path: 'createdBy',
        select: 'firstName lastName email'
      });
      
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Make sure user has access to the task
    if (req.user.role !== 'admin' && task.assignedTo._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this task'
      });
    }
    
    res.status(200).json({
      success: true,
      data: task
    });
  } catch (err) {
    console.error(err);
    
    // Check if error is a valid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message
    });
  }
};

// @desc    Create task
// @route   POST /api/tasks
// @access  Private/Admin
exports.createTask = async (req, res) => {
  try {
    const { name, description, startDate, endDate, assignedTo, isActive } = req.body;
    
    // Validate if assignedTo user exists
    const user = await User.findById(assignedTo);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Assigned user not found'
      });
    }
    
    // Create task
    const task = await Task.create({
      name,
      description,
      startDate,
      endDate,
      assignedTo,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user.id
    });
    
    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message
    });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private/Admin
exports.updateTask = async (req, res) => {
  try {
    const { name, description, startDate, endDate, assignedTo, isActive } = req.body;
    
    let task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // If assignedTo is provided, validate if user exists
    if (assignedTo) {
      const user = await User.findById(assignedTo);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Assigned user not found'
        });
      }
    }
    
    // Update task fields
    task.name = name || task.name;
    task.description = description !== undefined ? description : task.description;
    task.startDate = startDate || task.startDate;
    task.endDate = endDate || task.endDate;
    task.assignedTo = assignedTo || task.assignedTo;
    
    // Only update isActive if it's provided
    if (isActive !== undefined) {
      task.isActive = isActive;
    }
    
    // Update task
    task = await task.save();
    
    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: task
    });
  } catch (err) {
    console.error(err);
    
    // Check if error is a valid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message
    });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private/Admin
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    await task.remove();
    
    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
      data: {}
    });
  } catch (err) {
    console.error(err);
    
    // Check if error is a valid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message
    });
  }
};

// @desc    Update task completion
// @route   PUT /api/tasks/:id/completion
// @access  Private
exports.updateTaskCompletion = async (req, res) => {
  try {
    const { isCompleted, completionDate } = req.body;
    
    let task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Check if user is assigned to the task
    if (req.user.role !== 'admin' && task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this task'
      });
    }
    
    // Update completion status
    task.isCompleted = isCompleted !== undefined ? isCompleted : task.isCompleted;
    
    // Update completion date if provided or if task is marked as completed
    if (completionDate) {
      task.completionDate = completionDate;
    } else if (isCompleted && !task.completionDate) {
      task.completionDate = Date.now();
    }
    
    // If task is marked as not completed, remove completion date
    if (isCompleted === false) {
      task.completionDate = null;
    }
    
    // Update task
    task = await task.save();
    
    res.status(200).json({
      success: true,
      message: 'Task completion status updated successfully',
      data: task
    });
  } catch (err) {
    console.error(err);
    
    // Check if error is a valid ObjectId
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message
    });
  }
};