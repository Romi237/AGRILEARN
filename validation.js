const { body, validationResult } = require('express-validator');

// Validation middleware to check for errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// User validation rules
const validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('role')
    .isIn(['student', 'teacher'])
    .withMessage('Role must be either student or teacher'),
  
  body('expertise')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Expertise must not exceed 200 characters'),
  
  body('experience')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Experience must not exceed 500 characters'),
  
  handleValidationErrors
];

const validateUserLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Course validation rules
const validateCourse = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Course title must be between 5 and 100 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Course description must be between 20 and 2000 characters'),
  
  body('category')
    .isIn(['organic-farming', 'sustainable-agriculture', 'livestock-management', 'crop-production', 'soil-health', 'pest-management'])
    .withMessage('Invalid course category'),
  
  body('level')
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Course level must be beginner, intermediate, or advanced'),
  
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  
  body('duration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer'),
  
  handleValidationErrors
];

// Assignment validation rules
const validateAssignment = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Assignment title must be between 5 and 200 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Assignment description must be between 10 and 5000 characters'),
  
  body('course')
    .isMongoId()
    .withMessage('Invalid course ID'),
  
  body('dueDate')
    .isISO8601()
    .withMessage('Due date must be a valid date')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Due date must be in the future');
      }
      return true;
    }),
  
  body('maxPoints')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Maximum points must be between 1 and 1000'),
  
  body('allowLateSubmissions')
    .optional()
    .isBoolean()
    .withMessage('Allow late submissions must be a boolean'),
  
  body('latePenalty')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Late penalty must be between 0 and 100'),
  
  handleValidationErrors
];

// Project validation rules
const validateProject = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Project title must be between 5 and 200 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 3000 })
    .withMessage('Project description must be between 10 and 3000 characters'),
  
  body('course')
    .isMongoId()
    .withMessage('Invalid course ID'),
  
  handleValidationErrors
];

// Message validation rules
const validateMessage = [
  body('to')
    .isMongoId()
    .withMessage('Invalid recipient ID'),
  
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message content must be between 1 and 2000 characters'),
  
  body('subject')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Subject must not exceed 200 characters'),
  
  handleValidationErrors
];

// Student validation rules
const validateStudent = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Student name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  handleValidationErrors
];

// Grade validation rules
const validateGrade = [
  body('grade')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Grade must be between 0 and 100'),
  
  body('feedback')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Feedback must not exceed 1000 characters'),
  
  body('status')
    .optional()
    .isIn(['submitted', 'approved', 'rejected'])
    .withMessage('Status must be submitted, approved, or rejected'),
  
  handleValidationErrors
];

// Review validation rules
const validateReview = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment must not exceed 1000 characters'),
  
  handleValidationErrors
];

// ID parameter validation
const validateObjectId = (paramName) => [
  (req, res, next) => {
    const id = req.params[paramName];
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} ID format`
      });
    }
    next();
  }
];

// File upload validation
const validateFileUpload = (req, res, next) => {
  if (req.files && req.files.length > 0) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 
                         'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                         'text/plain', 'application/zip', 'application/x-rar-compressed'];
    
    for (const file of req.files) {
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: `File ${file.originalname} exceeds maximum size of 10MB`
        });
      }
      
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `File type ${file.mimetype} is not allowed`
        });
      }
    }
  }
  next();
};

// Sanitize input to prevent XSS
const sanitizeInput = (req, res, next) => {
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/javascript:/gi, '')
              .replace(/on\w+\s*=/gi, '');
  };

  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };

  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);

  next();
};

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateCourse,
  validateAssignment,
  validateProject,
  validateMessage,
  validateStudent,
  validateGrade,
  validateReview,
  validateObjectId,
  validateFileUpload,
  sanitizeInput
};
