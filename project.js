const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  title: String,
  description: String,
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: Date,
  status: { type: String, enum: ['submitted', 'approved', 'rejected'], default: 'submitted' },
  grade: { type: Number, min: 0, max: 100 },
  feedback: [{
    reviewer: String,
    comment: String,
    date: { type: Date, default: Date.now }
  }],
  files: [{
    name: String,
    url: String,
    size: Number
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Project', projectSchema);