const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'agriculture',
      'livestock',
      'technology',
      'business',
      'sustainability',
      'organic-farming',
      'crop-management',
      'soil-science',
      'irrigation',
      'pest-control',
      'plant-breeding',
      'agricultural-economics',
      'farm-management',
      'other'
    ]
  },
  level: {
    type: String,
    required: true,
    enum: ['beginner', 'intermediate', 'advanced']
  },
  duration: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  image: {
    type: String,
    default: 'images/default-course.jpg'
  },
  enrolledStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  maxStudents: {
    type: Number,
    default: 50
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  curriculum: [{
    title: String,
    description: String,
    order: Number,
    lessons: [{
      title: String,
      description: String,
      order: Number,
      content: [{
        type: {
          type: String,
          enum: ['text', 'video', 'audio', 'pdf', 'quiz'],
          default: 'text'
        },
        title: String,
        description: String,
        url: String,
        duration: Number,
        quiz: mongoose.Schema.Types.Mixed,
        isFreePreview: {
          type: Boolean,
          default: false
        },
        order: Number
      }]
    }],
    chapterExam: {
      title: String,
      description: String,
      questions: [mongoose.Schema.Types.Mixed],
      timeLimit: Number,
      passingScore: Number,
      attempts: Number,
      isRequired: Boolean
    }
  }],
  finalExam: {
    title: String,
    description: String,
    questions: [mongoose.Schema.Types.Mixed],
    timeLimit: Number,
    passingScore: Number,
    attempts: Number,
    isRequired: Boolean
  },
  ratings: {
    type: Map,
    of: Number,
    default: new Map()
  },
  lessons: [{
    title: String,
    content: String,
    videoUrl: String,
    duration: String,
    order: Number
  }],
  requirements: [String],
  learningOutcomes: [String],
  tags: [String],
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  reviews: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
courseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate average rating
courseSchema.methods.calculateAverageRating = function() {
  if (this.reviews.length === 0) {
    this.rating = 0;
    this.reviewCount = 0;
  } else {
    const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.rating = Math.round((totalRating / this.reviews.length) * 10) / 10;
    this.reviewCount = this.reviews.length;
  }
};

// Index for search functionality
courseSchema.index({ 
  title: 'text', 
  description: 'text',
  tags: 'text'
});

courseSchema.index({ category: 1 });
courseSchema.index({ level: 1 });
courseSchema.index({ price: 1 });
courseSchema.index({ rating: -1 });
courseSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Course', courseSchema);
