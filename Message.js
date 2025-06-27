const mongoose = require('mongoose');

// File attachment schema
const attachmentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  url: {
    type: String,
    required: true
  }
}, { timestamps: true });

// Enhanced message schema
const messageSchema = new mongoose.Schema({
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    maxlength: [5000, 'Message content cannot exceed 5000 characters']
  },
  attachments: [attachmentSchema],
  messageType: {
    type: String,
    enum: ['text', 'system', 'notification'],
    default: 'text'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  threadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  archived: {
    type: Boolean,
    default: false
  },
  starred: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    maxlength: 50
  }],
  metadata: {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment'
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
messageSchema.index({ to: 1, createdAt: -1 });
messageSchema.index({ from: 1, createdAt: -1 });
messageSchema.index({ threadId: 1, createdAt: 1 });
messageSchema.index({ read: 1, to: 1 });

// Virtual for thread messages
messageSchema.virtual('threadMessages', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'threadId'
});

// Instance methods
messageSchema.methods.markAsRead = function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

messageSchema.methods.addToThread = function(threadId) {
  this.threadId = threadId;
  return this.save();
};

// Static methods
messageSchema.statics.getConversations = function(userId) {
  return this.aggregate([
    {
      $match: {
        $or: [{ to: userId }, { from: userId }]
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $group: {
        _id: {
          $cond: [
            { $eq: ['$to', userId] },
            '$from',
            '$to'
          ]
        },
        lastMessage: { $first: '$content' },
        lastMessageDate: { $first: '$createdAt' },
        unreadCount: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$to', userId] }, { $eq: ['$read', false] }] },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $sort: { lastMessageDate: -1 }
    }
  ]);
};

messageSchema.statics.getThreadMessages = function(threadId) {
  return this.find({
    $or: [
      { _id: threadId },
      { threadId: threadId }
    ]
  })
  .populate('to', 'name email avatar')
  .populate('from', 'name email avatar')
  .sort({ createdAt: 1 });
};

module.exports = mongoose.model('Message', messageSchema);