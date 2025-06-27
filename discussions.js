const express = require('express');
const router = express.Router();
const Discussion = require('../models/discussion');
const { authenticateToken } = require('../middleware/auth');

// ➕ Create a new discussion
router.post('/:courseId', async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ success: false, message: 'All fields required' });

    const discussion = new Discussion({
      course: req.params.courseId,
      user: req.user.id,
      name: req.user.name,
      title,
      content
    });

    await discussion.save();
    res.json({ success: true, discussion });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create discussion' });
  }
});

// 📦 Get all discussions for a course
router.get('/:courseId', async (req, res) => {
  try {
    const discussions = await Discussion.find({ course: req.params.courseId }).sort({ createdAt: -1 });
    res.json({ success: true, discussions });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch discussions' });
  }
});

module.exports = router;