const express = require('express');
const Course = require('../models/Course');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');

// Configure multer for course content uploads
const courseContentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadType = req.body.uploadType || 'general';
    const uploadPath = path.join(__dirname, '..', 'uploads', 'courses', uploadType);

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedName}`);
  }
});

const courseContentUpload = multer({
  storage: courseContentStorage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit for videos
  },
  fileFilter: function (req, file, cb) {
    // Define allowed file types for course content
    const allowedTypes = {
      video: /\.(mp4|avi|mov|wmv|flv|webm)$/i,
      pdf: /\.pdf$/i,
      document: /\.(doc|docx|txt|rtf)$/i,
      image: /\.(jpg|jpeg|png|gif|bmp|svg)$/i,
      audio: /\.(mp3|wav|ogg|m4a)$/i,
      archive: /\.(zip|rar|7z|tar|gz)$/i
    };

    const uploadType = req.body.uploadType || 'general';
    let isAllowed = false;

    // Check if file type is allowed based on upload type
    if (uploadType === 'video') {
      isAllowed = allowedTypes.video.test(file.originalname);
    } else if (uploadType === 'pdf') {
      isAllowed = allowedTypes.pdf.test(file.originalname);
    } else if (uploadType === 'document') {
      isAllowed = allowedTypes.document.test(file.originalname);
    } else if (uploadType === 'image') {
      isAllowed = allowedTypes.image.test(file.originalname);
    } else if (uploadType === 'audio') {
      isAllowed = allowedTypes.audio.test(file.originalname);
    } else {
      // General upload - allow most common types
      isAllowed = Object.values(allowedTypes).some(regex => regex.test(file.originalname));
    }

    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed for ${uploadType} upload`), false);
    }
  }
});

// Helper: calculate rating average and breakdown
const calculateAverageRating = (ratingsMap) => {
  const ratings = Array.from(ratingsMap.values());
  if (!ratings.length) return { average: 0, breakdown: {} };

  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratings.forEach(r => breakdown[r]++);
  const sum = ratings.reduce((a, b) => a + b, 0);
  return {
    average: parseFloat((sum / ratings.length).toFixed(1)),
    breakdown
  };
};

// GET all courses with filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { sort, teacher, status, category } = req.query;
    let filter = {};
    let sortOption = { createdAt: -1 };

    if (sort === 'rating') sortOption = { averageRating: -1 };
    else if (sort === 'popularity') sortOption = { 'enrolledStudents.length': -1 };
    else if (sort === 'newest') sortOption = { createdAt: -1 };
    else if (sort === 'oldest') sortOption = { createdAt: 1 };

    if (teacher === 'true') {
      if (req.user?.role !== 'teacher') {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
      filter.teacher = req.user.id;
    }

    if (status === 'published') filter.isPublished = true;
    else if (status === 'draft') filter.isPublished = false;
    else if (status === 'archived') filter.isArchived = true;

    if (category) filter.category = category;

    const courses = await Course.find(filter)
      .populate('teacher', 'name email')
      .sort(sortOption);

    const result = courses.map(course => {
      const { average, breakdown } = calculateAverageRating(course.ratings);
      return {
        ...course.toObject(),
        averageRating: average,
        ratingBreakdown: breakdown,
        enrolledCount: course.enrolledStudents.length
      };
    });

    res.json({ success: true, courses: result });
  } catch (err) {
    console.error('[GET /courses] Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch courses' });
  }
});

// GET course preview for teachers (their own courses only)
router.get('/:id/preview', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can use the preview endpoint.'
      });
    }

    const course = await Course.findById(req.params.id)
      .populate('teacher', 'name email')
      .populate('enrolledStudents', 'name email');

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Teachers can only preview their own courses
    if (!course.teacher._id.equals(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only preview your own courses.'
      });
    }

    const { average, breakdown } = calculateAverageRating(course.ratings);
    res.json({
      success: true,
      course: {
        ...course.toObject(),
        averageRating: average,
        ratingBreakdown: breakdown,
        isEnrolled: false, // Teachers are not enrolled in their own courses
        canRate: false // Teachers cannot rate their own courses
      }
    });
  } catch (err) {
    console.error('[GET /courses/:id/preview] Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch course preview' });
  }
});

// GET course by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('teacher', 'name email')
      .populate('enrolledStudents', 'name email');

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Check if user is enrolled (for students)
    const isEnrolled = req.user?.role === 'student' &&
      course.enrolledStudents.some(s => s._id.equals(req.user.id));

    // Check if user is the course owner (for teachers)
    const isOwner = req.user?.role === 'teacher' && course.teacher._id.equals(req.user.id);

    const { average, breakdown } = calculateAverageRating(course.ratings);
    res.json({
      success: true,
      course: {
        ...course.toObject(),
        averageRating: average,
        ratingBreakdown: breakdown,
        isEnrolled,
        isOwner,
        canRate: isEnrolled && !course.ratings.has(req.user.id),
        canEnroll: req.user.role === 'student' && !isEnrolled
      }
    });
  } catch (err) {
    console.error('[GET /courses/:id] Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch course' });
  }
});

// POST create new course (teacher only)
router.post('/', async (req, res) => {
  try {
    // Check authentication - if token provided, validate it
    const authHeader = req.headers['authorization'];
    let userId = null;

    if (authHeader) {
      const token = authHeader.split(' ')[1];
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'teacher') {
          return res.status(403).json({ success: false, message: 'Only teachers can create courses' });
        }
        userId = decoded.id;
      } catch (err) {
        return res.status(403).json({ success: false, message: 'Invalid token' });
      }
    } else {
      // For development: use default teacher ID if no auth provided
      userId = '507f1f77bcf86cd799439011'; // Default MongoDB ObjectId
      console.log('No auth provided, using default teacher ID for development');
    }

    const { title, description, category, level, image, chapters, finalExam, duration, price } = req.body;

    // Map frontend categories to backend enum values
    const categoryMapping = {
      'organic-farming': 'agriculture',
      'crop-management': 'agriculture',
      'soil-science': 'agriculture',
      'irrigation': 'agriculture',
      'pest-control': 'agriculture',
      'plant-breeding': 'agriculture',
      'agricultural-economics': 'business',
      'farm-management': 'business'
    };

    const mappedCategory = categoryMapping[category] || category;

    // Debug log
    console.log('[POST /courses] Received data:', {
      title,
      description: description?.substring(0, 100) + '...',
      category,
      level,
      duration,
      price,
      chaptersCount: chapters?.length || 0,
      hasFinalExam: !!finalExam,
      chapters: chapters?.map(ch => ({
        title: ch.title,
        lessonsCount: ch.lessons?.length || 0,
        hasChapterExam: !!ch.chapterExam,
        lessons: ch.lessons?.map(l => ({
          title: l.title,
          contentCount: l.content?.length || 0
        }))
      }))
    });

    if (!title || !description || !category || !level) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, category and level are required'
      });
    }

    // Calculate duration from chapters if not provided
    let courseDuration = duration;
    if (!courseDuration && chapters && chapters.length > 0) {
      let totalMinutes = 0;
      chapters.forEach(chapter => {
        if (chapter.lessons) {
          chapter.lessons.forEach(lesson => {
            if (lesson.content) {
              lesson.content.forEach(content => {
                totalMinutes += content.duration || 0;
              });
            }
          });
        }
      });
      courseDuration = totalMinutes > 0 ? `${Math.ceil(totalMinutes / 60)} hours` : '1 hour';
    } else if (!courseDuration) {
      courseDuration = '1 hour'; // Default duration
    }

    // Set default price if not provided
    const coursePrice = price !== undefined ? price : 0; // Free course by default

    // Convert chapters to curriculum format if provided
    let curriculum = [];
    if (chapters && Array.isArray(chapters)) {
      curriculum = chapters.map((chapter, index) => ({
        title: chapter.title || `Chapter ${index + 1}`,
        description: chapter.description || '',
        order: chapter.order || index + 1,
        lessons: (chapter.lessons || []).map((lesson, lessonIndex) => ({
          title: lesson.title || `Lesson ${lessonIndex + 1}`,
          description: lesson.description || '',
          order: lesson.order || lessonIndex + 1,
          content: (lesson.content || []).map((content, contentIndex) => ({
            type: content.type || 'text',
            title: content.title || `Content ${contentIndex + 1}`,
            description: content.description || '',
            url: content.url || '',
            duration: content.duration || 0,
            quiz: content.quiz || null,
            isFreePreview: content.isFreePreview || false,
            order: content.order || contentIndex + 1
          }))
        })),
        chapterExam: chapter.chapterExam ? {
          title: chapter.chapterExam.title || `${chapter.title} Exam`,
          description: chapter.chapterExam.description || '',
          questions: chapter.chapterExam.questions || [],
          timeLimit: chapter.chapterExam.timeLimit || 60,
          passingScore: chapter.chapterExam.passingScore || 70,
          attempts: chapter.chapterExam.attempts || 3,
          isRequired: chapter.chapterExam.isRequired !== false
        } : null
      }));
    }

    // Handle final exam if provided
    let finalExamData = null;
    if (finalExam) {
      finalExamData = {
        title: finalExam.title || `${title} Final Exam`,
        description: finalExam.description || '',
        questions: finalExam.questions || [],
        timeLimit: finalExam.timeLimit || 120,
        passingScore: finalExam.passingScore || 70,
        attempts: finalExam.attempts || 3,
        isRequired: finalExam.isRequired !== false
      };
    }

    const newCourse = new Course({
      title,
      description,
      category: mappedCategory,
      level,
      duration: courseDuration,
      price: coursePrice,
      image: image || '/images/course-placeholder.jpg',
      teacher: userId,
      curriculum,
      finalExam: finalExamData,
      isPublished: false
    });

    await newCourse.save();

    res.status(201).json({
      success: true,
      course: newCourse,
      message: 'Course created successfully'
    });
  } catch (err) {
    console.error('[POST /courses] Error:', err);
    console.error('[POST /courses] Error stack:', err.stack);
    console.error('[POST /courses] Error name:', err.name);
    console.error('[POST /courses] Error message:', err.message);

    if (err.name === 'ValidationError') {
      console.error('[POST /courses] Validation errors:', err.errors);
      return res.status(400).json({
        success: false,
        message: 'Validation error: ' + Object.values(err.errors).map(e => e.message).join(', ')
      });
    }

    if (err.code === 11000 && err.keyPattern?.title) {
      return res.status(400).json({
        success: false,
        message: 'A course with this title already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create course',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// PUT update course (teacher only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    if (req.user.role !== 'teacher' || !course.teacher.equals(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to edit this course' });
    }

    const { title, description, category, level, image, isPublished, chapters } = req.body;

    course.title = title || course.title;
    course.description = description || course.description;
    course.category = category || course.category;
    course.level = level || course.level;
    course.image = image || course.image;

    if (typeof isPublished === 'boolean') {
      course.isPublished = isPublished;
    }

    // Update curriculum if chapters are provided
    if (chapters && Array.isArray(chapters)) {
      course.curriculum = chapters.map((chapter, index) => ({
        title: chapter.title || `Chapter ${index + 1}`,
        description: chapter.description || '',
        order: chapter.order || index + 1,
        lessons: (chapter.lessons || []).map((lesson, lessonIndex) => ({
          title: lesson.title || `Lesson ${lessonIndex + 1}`,
          duration: lesson.duration || '10m',
          contentUrl: lesson.contentUrl || '',
          isFreePreview: lesson.isFreePreview || false,
          order: lesson.order || lessonIndex + 1
        }))
      }));
    }

    await course.save();
    
    res.json({ 
      success: true, 
      course,
      message: 'Course updated successfully' 
    });
  } catch (err) {
    console.error('[PUT /courses/:id] Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update course' });
  }
});

// DELETE course (teacher or admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    if (req.user.role !== 'admin' && 
        (req.user.role !== 'teacher' || !course.teacher.equals(req.user.id))) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this course' });
    }

    await course.deleteOne();
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (err) {
    console.error('[DELETE /courses/:id] Error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete course' });
  }
});

// POST enroll in course (student only)
router.post('/:id/enroll', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can enroll in courses' });
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    if (course.enrolledStudents.includes(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Already enrolled in this course' });
    }

    course.enrolledStudents.push(req.user.id);
    await course.save();

    res.json({ success: true, message: 'Enrolled successfully' });
  } catch (err) {
    console.error('[POST /courses/:id/enroll] Error:', err);
    res.status(500).json({ success: false, message: 'Failed to enroll in course' });
  }
});

// POST rate course (student only)
router.post('/:id/rate', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can rate courses' });
    }

    const { rating } = req.body;
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    if (!course.enrolledStudents.includes(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You must enroll to rate the course' });
    }

    course.ratings.set(req.user.id, rating);
    await course.save();

    const { average, breakdown } = calculateAverageRating(course.ratings);
    res.json({ 
      success: true, 
      message: 'Rating submitted successfully',
      averageRating: average,
      ratingBreakdown: breakdown
    });
  } catch (err) {
    console.error('[POST /courses/:id/rate] Error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit rating' });
  }
});

// GET course reviews
router.get('/:id/reviews', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('reviews.user', 'name email');
    
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    res.json({
      success: true,
      reviews: course.reviews || []
    });
  } catch (err) {
    console.error('[GET /courses/:id/reviews] Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
});

// POST add review (student only)
router.post('/:id/reviews', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can review courses' });
    }

    const { comment } = req.body;
    if (!comment || comment.trim() === '') {
      return res.status(400).json({ success: false, message: 'Review comment is required' });
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    if (!course.enrolledStudents.includes(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You must enroll to review the course' });
    }

    course.reviews.push({
      user: req.user.id,
      name: req.user.name,
      comment: comment.trim()
    });

    await course.save();
    res.json({ success: true, message: 'Review added successfully' });
  } catch (err) {
    console.error('[POST /courses/:id/reviews] Error:', err);
    res.status(500).json({ success: false, message: 'Failed to add review' });
  }
});

// Search courses
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === '') {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    const courses = await Course.find(
      { $text: { $search: q } },
      { score: { $meta: 'textScore' } }
    )
    .sort({ score: { $meta: 'textScore' } })
    .populate('teacher', 'name')
    .limit(20);

    const result = courses.map(course => {
      const { average, breakdown } = calculateAverageRating(course.ratings);
      return {
        ...course.toObject(),
        averageRating: average,
        ratingBreakdown: breakdown,
        enrolledCount: course.enrolledStudents.length
      };
    });

    res.json({ success: true, courses: result });
  } catch (err) {
    console.error('[GET /courses/search] Error:', err);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
});

// POST /courses/upload-content - Upload course content (videos, PDFs, etc.)
router.post('/upload-content', authenticateToken, courseContentUpload.single('file'), async (req, res) => {
  try {
    const { courseId, chapterId, lessonId, contentType, title, description } = req.body;

    // Check if user is a teacher
    const user = await require('../models/User').findById(req.user.id);
    if (!user || user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can upload course content'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Verify course ownership
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (course.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only upload content to your own courses'
      });
    }

    // Create file info object
    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/courses/${req.body.uploadType || 'general'}/${req.file.filename}`,
      uploadedAt: new Date()
    };

    // If specific chapter and lesson are provided, add content to that lesson
    if (chapterId && lessonId) {
      const chapter = course.curriculum.id(chapterId);
      if (!chapter) {
        return res.status(404).json({
          success: false,
          message: 'Chapter not found'
        });
      }

      const lesson = chapter.lessons.id(lessonId);
      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found'
        });
      }

      // Add content item to lesson
      const contentItem = {
        type: contentType || getContentTypeFromFile(req.file.mimetype),
        title: title || req.file.originalname,
        description: description || '',
        url: fileInfo.url,
        duration: contentType === 'video' ? 0 : undefined, // Can be updated later
        order: lesson.content.length + 1
      };

      lesson.content.push(contentItem);
      await course.save();

      res.json({
        success: true,
        message: 'Content uploaded successfully',
        fileInfo,
        contentItem
      });
    } else {
      // Return file info for manual assignment
      res.json({
        success: true,
        message: 'File uploaded successfully',
        fileInfo
      });
    }

  } catch (error) {
    console.error('Error uploading course content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload content: ' + error.message
    });
  }
});

// POST /courses/upload-bulk - Upload multiple files for a course
router.post('/upload-bulk', authenticateToken, courseContentUpload.array('files', 10), async (req, res) => {
  try {
    const { courseId } = req.body;

    // Check if user is a teacher
    const user = await require('../models/User').findById(req.user.id);
    if (!user || user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can upload course content'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    // Verify course ownership
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (course.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only upload content to your own courses'
      });
    }

    // Process all uploaded files
    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `/uploads/courses/${req.body.uploadType || 'general'}/${file.filename}`,
      contentType: getContentTypeFromFile(file.mimetype),
      uploadedAt: new Date()
    }));

    res.json({
      success: true,
      message: `${uploadedFiles.length} files uploaded successfully`,
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Error uploading bulk content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload files: ' + error.message
    });
  }
});

// Helper function to determine content type from MIME type
function getContentTypeFromFile(mimeType) {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('document') || mimeType.includes('word')) return 'document';
  return 'text';
}

// GET /courses/:courseId/quiz/:type/:quizId - Get quiz for taking
router.get('/:courseId/quiz/:type/:quizId', authenticateToken, async (req, res) => {
  try {
    const { courseId, type, quizId } = req.params;

    // Verify user has access to the course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is enrolled or is the teacher
    const user = await require('../models/User').findById(req.user.id);
    const isTeacher = user.role === 'teacher' && course.teacher.toString() === req.user.id;
    const isEnrolled = course.enrolledStudents.includes(req.user.id);

    if (!isTeacher && !isEnrolled) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to take quizzes'
      });
    }

    let quiz = null;

    if (type === 'lesson') {
      // Find quiz in lesson content
      for (const chapter of course.curriculum) {
        for (const lesson of chapter.lessons) {
          const quizContent = lesson.content.find(content =>
            content.type === 'quiz' && content._id.toString() === quizId
          );
          if (quizContent && quizContent.quiz) {
            quiz = quizContent.quiz;
            break;
          }
        }
        if (quiz) break;
      }
    } else if (type === 'chapter') {
      // Find chapter exam
      const chapter = course.curriculum.find(ch =>
        ch.chapterExam && ch._id.toString() === quizId
      );
      if (chapter && chapter.chapterExam) {
        quiz = chapter.chapterExam;
      }
    } else if (type === 'final') {
      // Get final exam
      if (course.finalExam && course._id.toString() === courseId) {
        quiz = course.finalExam;
      }
    }

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Remove correct answers from questions for students
    if (!isTeacher) {
      quiz = {
        ...quiz.toObject(),
        questions: quiz.questions.map(q => ({
          ...q.toObject(),
          correctAnswer: undefined,
          options: q.options.map(opt => ({
            text: opt.text,
            // Don't include isCorrect flag
          }))
        }))
      };
    }

    res.json({
      success: true,
      quiz
    });

  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quiz'
    });
  }
});

// POST /courses/:courseId/quiz/:type/:quizId/submit - Submit quiz answers
router.post('/:courseId/quiz/:type/:quizId/submit', authenticateToken, async (req, res) => {
  try {
    const { courseId, type, quizId } = req.params;
    const { answers, timeTaken, percentage, passed } = req.body;

    // Verify user has access to the course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is enrolled
    if (!course.enrolledStudents.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to submit quizzes'
      });
    }

    // Create quiz result record (you might want to create a separate QuizResult model)
    const quizResult = {
      userId: req.user.id,
      courseId,
      quizId,
      quizType: type,
      answers,
      score: percentage,
      passed,
      timeTaken,
      submittedAt: new Date()
    };

    // For now, we'll store results in a simple way
    // In a production app, you'd want a separate QuizResult model
    console.log('Quiz result:', quizResult);

    res.json({
      success: true,
      message: 'Quiz submitted successfully',
      result: {
        score: percentage,
        passed,
        timeTaken
      }
    });

  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit quiz'
    });
  }
});

module.exports = router;