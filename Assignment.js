const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  content: {
    type: String,
    required: true
  },
  files: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimetype: String
  }],
  grade: {
    type: Number,
    min: 0,
    max: 100
  },
  feedback: String,
  status: {
    type: String,
    enum: ['submitted', 'graded', 'returned'],
    default: 'submitted'
  },
  gradedAt: Date,
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Assignment title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Assignment description is required'],
    minlength: [10, 'Description must be at least 10 characters'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  instructions: {
    type: String,
    maxlength: [3000, 'Instructions cannot exceed 3000 characters']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required'],
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'Due date must be in the future'
    }
  },
  maxPoints: {
    type: Number,
    default: 100,
    min: [1, 'Maximum points must be at least 1'],
    max: [1000, 'Maximum points cannot exceed 1000']
  },
  allowLateSubmissions: {
    type: Boolean,
    default: true
  },
  latePenalty: {
    type: Number,
    default: 10,
    min: [0, 'Late penalty cannot be negative'],
    max: [100, 'Late penalty cannot exceed 100%']
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimetype: String
  }],
  submissions: [submissionSchema],
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: Date,
  status: {
    type: String,
    enum: ['draft', 'published', 'closed'],
    default: 'draft'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for submission count
assignmentSchema.virtual('submissionCount').get(function() {
  return this.submissions ? this.submissions.length : 0;
});

// Virtual for graded submission count
assignmentSchema.virtual('gradedCount').get(function() {
  return this.submissions ? this.submissions.filter(s => s.status === 'graded').length : 0;
});

// Virtual for pending submission count
assignmentSchema.virtual('pendingCount').get(function() {
  return this.submissions ? this.submissions.filter(s => s.status === 'submitted').length : 0;
});

// Virtual for average grade
assignmentSchema.virtual('averageGrade').get(function() {
  if (!this.submissions || this.submissions.length === 0) return null;
  const gradedSubmissions = this.submissions.filter(s => s.grade !== undefined && s.grade !== null);
  if (gradedSubmissions.length === 0) return null;
  const total = gradedSubmissions.reduce((sum, s) => sum + s.grade, 0);
  return Math.round((total / gradedSubmissions.length) * 100) / 100;
});

// Virtual for time remaining
assignmentSchema.virtual('timeRemaining').get(function() {
  if (!this.dueDate) return null;
  const now = new Date();
  const due = new Date(this.dueDate);
  const diff = due - now;
  
  if (diff <= 0) return 'Overdue';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} remaining`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} remaining`;
  return 'Due soon';
});

// Index for efficient queries
assignmentSchema.index({ course: 1, teacher: 1 });
assignmentSchema.index({ dueDate: 1 });
assignmentSchema.index({ status: 1 });
assignmentSchema.index({ 'submissions.student': 1 });

// Pre-save middleware
assignmentSchema.pre('save', function(next) {
  if (this.isModified('isPublished') && this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
    this.status = 'published';
  }
  next();
});

// Static methods
assignmentSchema.statics.findByTeacher = function(teacherId) {
  return this.find({ teacher: teacherId })
    .populate('course', 'title')
    .sort({ createdAt: -1 });
};

assignmentSchema.statics.findByCourse = function(courseId) {
  return this.find({ course: courseId, isPublished: true })
    .populate('teacher', 'name')
    .sort({ dueDate: 1 });
};

assignmentSchema.statics.findPendingReviews = function(teacherId) {
  return this.find({ 
    teacher: teacherId,
    'submissions.status': 'submitted'
  })
  .populate('course', 'title')
  .populate('submissions.student', 'name email');
};

// Instance methods
assignmentSchema.methods.addSubmission = function(studentId, content, files = []) {
  const existingSubmission = this.submissions.find(s => s.student.toString() === studentId.toString());
  
  if (existingSubmission) {
    throw new Error('Student has already submitted this assignment');
  }
  
  this.submissions.push({
    student: studentId,
    content,
    files,
    submittedAt: new Date()
  });
  
  return this.save();
};

assignmentSchema.methods.gradeSubmission = function(studentId, grade, feedback, gradedBy) {
  const submission = this.submissions.find(s => s.student.toString() === studentId.toString());
  
  if (!submission) {
    throw new Error('Submission not found');
  }
  
  submission.grade = grade;
  submission.feedback = feedback;
  submission.status = 'graded';
  submission.gradedAt = new Date();
  submission.gradedBy = gradedBy;
  
  return this.save();
};

assignmentSchema.methods.getSubmissionByStudent = function(studentId) {
  return this.submissions.find(s => s.student.toString() === studentId.toString());
};

module.exports = mongoose.model('Assignment', assignmentSchema);
