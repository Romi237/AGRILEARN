const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Course = require('../models/Course');
const { authenticateToken, authenticateTeacher } = require('../middleware/auth');

// Get all students (for teachers)
router.get('/', authenticateTeacher, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const skip = (page - 1) * limit;

    let query = { role: 'student' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Get students enrolled in teacher's courses
    const teacherCourses = await Course.find({ teacher: req.user.id }).select('_id');
    const courseIds = teacherCourses.map(c => c._id);

    const students = await User.find({
      ...query,
      _id: { $in: await Course.distinct('enrolledStudents', { _id: { $in: courseIds } }) }
    })
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get enrollment details for each student
    const studentsWithCourses = await Promise.all(
      students.map(async (student) => {
        const enrolledCourses = await Course.find({
          enrolledStudents: student._id,
          teacher: req.user.id
        }).select('title');

        return {
          ...student.toObject(),
          enrolledCourses: enrolledCourses.map(c => ({ title: c.title, _id: c._id })),
          joinedDate: student.createdAt
        };
      })
    );

    const total = await User.countDocuments({
      ...query,
      _id: { $in: await Course.distinct('enrolledStudents', { _id: { $in: courseIds } }) }
    });

    res.json({
      success: true,
      students: studentsWithCourses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students'
    });
  }
});

// Get single student details
router.get('/:id', authenticateTeacher, async (req, res) => {
  try {
    const student = await User.findOne({
      _id: req.params.id,
      role: 'student'
    }).select('-password');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get courses the student is enrolled in (taught by this teacher)
    const enrolledCourses = await Course.find({
      enrolledStudents: student._id,
      teacher: req.user.id
    }).select('title description');

    res.json({
      success: true,
      student: {
        ...student.toObject(),
        enrolledCourses,
        joinedDate: student.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student'
    });
  }
});

// Create new student (for teachers)
router.post('/', authenticateTeacher, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create student
    const student = new User({
      name,
      email,
      password: hashedPassword,
      role: 'student'
    });

    await student.save();

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        role: student.role,
        createdAt: student.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error creating student'
    });
  }
});

// Update student details
router.put('/:id', authenticateTeacher, async (req, res) => {
  try {
    const { name, email } = req.body;

    const student = await User.findOne({
      _id: req.params.id,
      role: 'student'
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if email is already taken by another user
    if (email && email !== student.email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: req.params.id }
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already taken'
        });
      }
    }

    // Update fields
    if (name) student.name = name;
    if (email) student.email = email;

    await student.save();

    res.json({
      success: true,
      message: 'Student updated successfully',
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        role: student.role,
        createdAt: student.createdAt
      }
    });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error updating student'
    });
  }
});

// Enroll student in course
router.post('/:id/enroll/:courseId', authenticateTeacher, async (req, res) => {
  try {
    const { id: studentId, courseId } = req.params;

    // Verify student exists
    const student = await User.findOne({
      _id: studentId,
      role: 'student'
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Verify course exists and belongs to teacher
    const course = await Course.findOne({
      _id: courseId,
      teacher: req.user.id
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or access denied'
      });
    }

    // Check if already enrolled
    if (course.enrolledStudents.includes(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Student is already enrolled in this course'
      });
    }

    // Enroll student
    course.enrolledStudents.push(studentId);
    await course.save();

    res.json({
      success: true,
      message: 'Student enrolled successfully'
    });
  } catch (error) {
    console.error('Error enrolling student:', error);
    res.status(500).json({
      success: false,
      message: 'Error enrolling student'
    });
  }
});

// Remove student from course
router.delete('/:id/enroll/:courseId', authenticateTeacher, async (req, res) => {
  try {
    const { id: studentId, courseId } = req.params;

    // Verify course exists and belongs to teacher
    const course = await Course.findOne({
      _id: courseId,
      teacher: req.user.id
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or access denied'
      });
    }

    // Remove student from course
    course.enrolledStudents = course.enrolledStudents.filter(
      id => id.toString() !== studentId
    );
    await course.save();

    res.json({
      success: true,
      message: 'Student removed from course successfully'
    });
  } catch (error) {
    console.error('Error removing student from course:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing student from course'
    });
  }
});

module.exports = router;