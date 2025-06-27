const express = require('express');
const User = require('../models/User');
const Course = require('../models/Course');
const Certificate = require('../models/certificate');
const Project = require('../models/project');
const router = express.Router();

// Middleware to ensure admin access
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admins only' });
  }
  next();
}

// ✅ Get all users
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// ✅ Delete user by ID
router.delete('/users/:userId', requireAdmin, async (req, res) => {
  try {
    const userId = req.params.userId;

    // Clean up user-related data (optional)
    await Course.updateMany({}, { $pull: { enrolledStudents: userId } });
    await Certificate.deleteMany({ student: userId });
    await Project.deleteMany({ student: userId });
    await User.findByIdAndDelete(userId);

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

module.exports = router;