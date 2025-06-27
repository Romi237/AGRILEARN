const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Assignment = require('../models/Assignment');
const Course = require('../models/Course');
const { authenticateToken, authenticateTeacher } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/assignments/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, documents, and archives are allowed.'));
    }
  }
});

// Test route
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Assignments route is working!' });
});

// Simple test route for pending count without auth
router.get('/test-count', async (req, res) => {
  try {
    console.log('Test count route called');
    res.json({ success: true, count: 5, message: 'Test count working' });
  } catch (error) {
    console.error('Test count error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /assignments/pending-count - Get count of pending assignments for teacher
router.get('/pending-count', authenticateToken, async (req, res) => {
  try {
    console.log('Pending count request from user:', req.user);

    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Teachers only.'
      });
    }

    console.log('Querying assignments for teacher:', req.user.id);

    // Simple count query first to test
    const totalCount = await Assignment.countDocuments({ teacher: req.user.id });
    console.log('Total assignments for teacher:', totalCount);

    const pendingCount = await Assignment.countDocuments({
      teacher: req.user.id,
      isPublished: true,
      dueDate: { $gte: new Date() }
    });

    console.log('Pending assignments count:', pendingCount);

    res.json({
      success: true,
      count: pendingCount
    });
  } catch (error) {
    console.error('Error getting pending assignments count:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending assignments count',
      error: error.message
    });
  }
});

// GET /assignments - Get all assignments (filtered by role)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { course, status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    if (req.user.role === 'teacher') {
      query.teacher = req.user.id;
    } else {
      // For students, only show published assignments from enrolled courses
      const enrolledCourses = await Course.find({
        enrolledStudents: req.user.id
      }).select('_id');
      query.course = { $in: enrolledCourses.map(c => c._id) };
      query.isPublished = true;
    }

    if (course) query.course = course;
    if (status) query.status = status;

    const assignments = await Assignment.find(query)
      .populate('course', 'title')
      .populate('teacher', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Assignment.countDocuments(query);

    res.json({
      success: true,
      assignments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignments'
    });
  }
});

// GET /assignments/:id - Get single assignment
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('course', 'title enrolledStudents')
      .populate('teacher', 'name email')
      .populate('submissions.student', 'name email');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Check permissions
    if (req.user.role === 'teacher' && assignment.teacher._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (req.user.role === 'student') {
      // Check if student is enrolled in the course
      if (!assignment.course.enrolledStudents.includes(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // For students, only show their own submission
      assignment.submissions = assignment.submissions.filter(
        s => s.student._id.toString() === req.user.id
      );
    }

    res.json({
      success: true,
      assignment
    });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignment'
    });
  }
});

// POST /assignments - Create new assignment (teachers only)
router.post('/', authenticateTeacher, upload.array('attachments', 5), async (req, res) => {
  try {
    const {
      title,
      description,
      instructions,
      course,
      dueDate,
      maxPoints,
      allowLateSubmissions,
      latePenalty
    } = req.body;

    // Verify teacher owns the course
    const courseDoc = await Course.findById(course);
    if (!courseDoc) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (courseDoc.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only create assignments for your own courses'
      });
    }

    // Process uploaded files
    const attachments = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype
    })) : [];

    const assignment = new Assignment({
      title,
      description,
      instructions,
      course,
      teacher: req.user.id,
      dueDate: new Date(dueDate),
      maxPoints: maxPoints || 100,
      allowLateSubmissions: allowLateSubmissions !== 'false',
      latePenalty: latePenalty || 10,
      attachments
    });

    await assignment.save();
    await assignment.populate('course', 'title');

    res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      assignment
    });
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create assignment'
    });
  }
});

// PUT /assignments/:id - Update assignment (teachers only)
router.put('/:id', authenticateTeacher, upload.array('attachments', 5), async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    if (assignment.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const {
      title,
      description,
      instructions,
      dueDate,
      maxPoints,
      allowLateSubmissions,
      latePenalty,
      isPublished
    } = req.body;

    // Update fields
    if (title) assignment.title = title;
    if (description) assignment.description = description;
    if (instructions) assignment.instructions = instructions;
    if (dueDate) assignment.dueDate = new Date(dueDate);
    if (maxPoints) assignment.maxPoints = maxPoints;
    if (allowLateSubmissions !== undefined) assignment.allowLateSubmissions = allowLateSubmissions !== 'false';
    if (latePenalty !== undefined) assignment.latePenalty = latePenalty;
    if (isPublished !== undefined) assignment.isPublished = isPublished !== 'false';

    // Add new attachments
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype
      }));
      assignment.attachments.push(...newAttachments);
    }

    await assignment.save();
    await assignment.populate('course', 'title');

    res.json({
      success: true,
      message: 'Assignment updated successfully',
      assignment
    });
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update assignment'
    });
  }
});

// DELETE /assignments/:id - Delete assignment (teachers only)
router.delete('/:id', authenticateTeacher, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    if (assignment.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if there are submissions
    if (assignment.submissions && assignment.submissions.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete assignment with existing submissions'
      });
    }

    await Assignment.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete assignment'
    });
  }
});

// GET /assignments/:id/submissions - Get submissions for an assignment (teachers only)
router.get('/:id/submissions', authenticateTeacher, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('course', 'title enrolledStudents')
      .populate('submissions.student', 'name email avatar')
      .lean();

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Check if teacher owns this assignment
    if (assignment.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      submissions: assignment.submissions || []
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch submissions'
    });
  }
});

// PUT /assignments/submissions/:submissionId/grade - Grade a submission (teachers only)
router.put('/submissions/:submissionId/grade', authenticateTeacher, async (req, res) => {
  try {
    const { grade, feedback } = req.body;

    // Validate grade
    if (typeof grade !== 'number' || grade < 0 || grade > 100) {
      return res.status(400).json({
        success: false,
        message: 'Grade must be a number between 0 and 100'
      });
    }

    // Find the assignment containing this submission
    const assignment = await Assignment.findOne({
      'submissions._id': req.params.submissionId,
      teacher: req.user.id
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found or access denied'
      });
    }

    // Find and update the specific submission
    const submission = assignment.submissions.id(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    submission.grade = grade;
    submission.feedback = feedback || '';
    submission.status = 'graded';
    submission.gradedAt = new Date();

    await assignment.save();

    res.json({
      success: true,
      message: 'Grade saved successfully',
      submission: {
        _id: submission._id,
        grade: submission.grade,
        feedback: submission.feedback,
        status: submission.status,
        gradedAt: submission.gradedAt
      }
    });
  } catch (error) {
    console.error('Error grading submission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save grade'
    });
  }
});

// POST /assignments/:id/submit - Submit assignment (students only)
router.post('/:id/submit', authenticateToken, upload.array('files', 5), async (req, res) => {
  try {
    const { content } = req.body;

    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can submit assignments'
      });
    }

    const assignment = await Assignment.findById(req.params.id)
      .populate('course', 'enrolledStudents');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Check if student is enrolled in the course
    if (!assignment.course.enrolledStudents.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this course'
      });
    }

    // Check if assignment is still open
    if (assignment.dueDate && new Date() > new Date(assignment.dueDate)) {
      return res.status(400).json({
        success: false,
        message: 'Assignment deadline has passed'
      });
    }

    // Check if student has already submitted
    const existingSubmission = assignment.submissions.find(
      s => s.student.toString() === req.user.id
    );

    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted this assignment'
      });
    }

    // Process uploaded files
    const files = req.files ? req.files.map(file => ({
      name: file.originalname,
      url: `/uploads/assignments/${file.filename}`,
      size: file.size
    })) : [];

    // Create submission
    const submission = {
      student: req.user.id,
      content: content || '',
      files: files,
      submittedAt: new Date(),
      status: 'submitted'
    };

    assignment.submissions.push(submission);
    await assignment.save();

    res.json({
      success: true,
      message: 'Assignment submitted successfully',
      submission: submission
    });
  } catch (error) {
    console.error('Error submitting assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit assignment'
    });
  }
});

module.exports = router;
