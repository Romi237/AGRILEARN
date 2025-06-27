const express = require('express');
const multer = require('multer');
const path = require('path');
const Project = require('../models/project');
const Course = require('../models/Course');
const { authenticateToken, authenticateTeacher } = require('../middleware/auth');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/projects/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar|mp4|mov|avi/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only documents, images, videos, and archives are allowed.'));
    }
  }
});

// GET /projects - Get all projects (filtered by role)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { course, status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    if (req.user.role === 'teacher') {
      // For teachers, get projects from their courses
      const teacherCourses = await Course.find({ teacher: req.user.id }).select('_id');
      query.course = { $in: teacherCourses.map(c => c._id) };
    } else {
      // For students, get only their own projects
      query.student = req.user.id;
    }

    if (course) query.course = course;
    if (status) query.status = status;

    const projects = await Project.find(query)
      .populate('student', 'name email')
      .populate('course', 'title')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Project.countDocuments(query);

    res.json({
      success: true,
      projects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects'
    });
  }
});

// POST /projects - Submit a new project (Students only)
router.post('/', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can submit projects'
      });
    }

    const { course, title, description } = req.body;

    // Verify student is enrolled in the course
    const courseDoc = await Course.findById(course);
    if (!courseDoc) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (!courseDoc.enrolledStudents.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this course'
      });
    }

    // Process uploaded files
    const files = req.files ? req.files.map(file => ({
      name: file.filename,
      url: file.path,
      size: file.size
    })) : [];

    const project = new Project({
      student: req.user.id,
      course,
      title,
      description,
      files,
      submittedAt: new Date()
    });

    await project.save();
    await project.populate('course', 'title');

    res.status(201).json({
      success: true,
      message: 'Project submitted successfully',
      project
    });
  } catch (error) {
    console.error('Error submitting project:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to submit project'
    });
  }
});

// GET /projects/:id - Get single project
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('student', 'name email')
      .populate('course', 'title teacher');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check permissions
    if (req.user.role === 'student' && project.student._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (req.user.role === 'teacher' && project.course.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({ success: true, project });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project'
    });
  }
});

// POST /projects/:id/review - Review/Grade project (Teachers only)
router.post('/:id/review', authenticateTeacher, async (req, res) => {
  try {
    const { grade, feedback, status } = req.body;

    const project = await Project.findById(req.params.id)
      .populate('course', 'teacher title');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if teacher owns the course
    if (project.course.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only review projects from your courses'
      });
    }

    // Validate grade
    if (grade !== undefined && (grade < 0 || grade > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Grade must be between 0 and 100'
      });
    }

    // Update project
    if (grade !== undefined) project.grade = grade;
    if (status) project.status = status;
    project.reviewedAt = new Date();

    if (feedback) {
      project.feedback = project.feedback || [];
      project.feedback.push({
        reviewer: req.user.name || 'Teacher',
        comment: feedback,
        date: new Date()
      });
    }

    await project.save();

    res.json({
      success: true,
      message: 'Project reviewed successfully',
      project
    });
  } catch (error) {
    console.error('Error reviewing project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review project'
    });
  }
});

// PUT /projects/:id/status - Update project status (Teachers only)
router.put('/:id/status', authenticateTeacher, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['submitted', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: submitted, approved, or rejected'
      });
    }

    const project = await Project.findById(req.params.id)
      .populate('course', 'teacher');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if teacher owns the course
    if (project.course.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update projects from your courses'
      });
    }

    project.status = status;
    if (status !== 'submitted') {
      project.reviewedAt = new Date();
    }

    await project.save();

    res.json({
      success: true,
      message: 'Project status updated successfully',
      project
    });
  } catch (error) {
    console.error('Error updating project status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project status'
    });
  }
});

module.exports = router;