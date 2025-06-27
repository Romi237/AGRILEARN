const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Message = require('../models/Message');
const User = require('../models/User');
const Course = require('../models/Course');
const { authenticateToken } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/messages/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per message
  },
  fileFilter: function (req, file, cb) {
    // Allow common file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, documents, and archives are allowed'));
    }
  }
});

// Test route
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Messages route is working!' });
});

// Simple test route for unread count without auth
router.get('/test-unread', async (req, res) => {
  try {
    console.log('Test unread count route called');
    res.json({ success: true, count: 3, message: 'Test unread count working' });
  } catch (error) {
    console.error('Test unread count error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /messages/unread-count - Get count of unread messages
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    console.log('Unread count request from user:', req.user);

    // Simple count query first to test
    const totalCount = await Message.countDocuments({ to: req.user.id });
    console.log('Total messages for user:', totalCount);

    const unreadCount = await Message.countDocuments({
      to: req.user.id,
      read: false
    });

    console.log('Unread messages count:', unreadCount);

    res.json({
      success: true,
      count: unreadCount
    });
  } catch (error) {
    console.error('Error getting unread messages count:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread messages count',
      error: error.message
    });
  }
});

// GET /messages - Get all messages for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, unread, conversation } = req.query;
    const skip = (page - 1) * limit;
    
    let query = {
      $or: [
        { to: req.user.id },
        { from: req.user.id }
      ]
    };
    
    if (unread === 'true') {
      query.read = false;
      query.to = req.user.id; // Only unread messages TO the user
    }
    
    if (conversation) {
      query = {
        $or: [
          { to: req.user.id, from: conversation },
          { to: conversation, from: req.user.id }
        ]
      };
    }
    
    const messages = await Message.find(query)
      .populate('to', 'name email role')
      .populate('from', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Message.countDocuments(query);
    
    res.json({
      success: true,
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages'
    });
  }
});

// GET /messages/conversations - Get conversation list
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    // Get all unique conversation partners
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { to: req.user.id },
            { from: req.user.id }
          ]
        }
      },
      {
        $addFields: {
          partner: {
            $cond: {
              if: { $eq: ['$to', req.user.id] },
              then: '$from',
              else: '$to'
            }
          }
        }
      },
      {
        $group: {
          _id: '$partner',
          lastMessage: { $first: '$content' },
          lastMessageDate: { $first: '$createdAt' },
          unreadCount: {
            $sum: {
              $cond: {
                if: {
                  $and: [
                    { $eq: ['$to', req.user.id] },
                    { $eq: ['$read', false] }
                  ]
                },
                then: 1,
                else: 0
              }
            }
          }
        }
      },
      {
        $sort: { lastMessageDate: -1 }
      }
    ]);
    
    // Populate user details
    const populatedConversations = await User.populate(conversations, {
      path: '_id',
      select: 'name email role'
    });
    
    res.json({
      success: true,
      conversations: populatedConversations.map(conv => ({
        user: conv._id,
        lastMessage: conv.lastMessage,
        lastMessageDate: conv.lastMessageDate,
        unreadCount: conv.unreadCount
      }))
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations'
    });
  }
});

// GET /messages/:id - Get single message
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('to', 'name email role')
      .populate('from', 'name email role');
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Check permissions
    if (message.to._id.toString() !== req.user.id && message.from._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Mark as read if user is the recipient
    if (message.to._id.toString() === req.user.id && !message.read) {
      message.read = true;
      await message.save();
    }
    
    res.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch message'
    });
  }
});

// POST /messages - Send new message with optional file attachments
router.post('/', authenticateToken, upload.array('attachments', 5), async (req, res) => {
  try {
    const { to, content, subject, priority, threadId, replyTo } = req.body;

    if (!to || !content) {
      return res.status(400).json({
        success: false,
        message: 'Recipient and content are required'
      });
    }

    // Verify recipient exists
    const recipient = await User.findById(to);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }

    // Check if users can message each other
    const canMessage = await checkMessagingPermissions(req.user.id, to);
    if (!canMessage) {
      return res.status(403).json({
        success: false,
        message: 'You can only message teachers/students from your courses'
      });
    }

    // Process file attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        attachments.push({
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          url: `/uploads/messages/${file.filename}`
        });
      }
    }

    const messageData = {
      from: req.user.id,
      to,
      content,
      subject,
      attachments,
      priority: priority || 'normal'
    };

    // Handle threading
    if (threadId) {
      messageData.threadId = threadId;
    }
    if (replyTo) {
      messageData.replyTo = replyTo;
      // If replying to a message, inherit its thread or create new thread
      if (!threadId) {
        const parentMessage = await Message.findById(replyTo);
        if (parentMessage) {
          messageData.threadId = parentMessage.threadId || parentMessage._id;
        }
      }
    }

    const message = new Message(messageData);
    await message.save();
    await message.populate('to', 'name email role avatar');
    await message.populate('from', 'name email role avatar');

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to send message'
    });
  }
});

// GET /messages/thread/:threadId - Get all messages in a thread
router.get('/thread/:threadId', authenticateToken, async (req, res) => {
  try {
    const threadMessages = await Message.getThreadMessages(req.params.threadId);

    // Check if user has access to this thread
    const hasAccess = threadMessages.some(msg =>
      msg.to._id.toString() === req.user.id || msg.from._id.toString() === req.user.id
    );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this thread'
      });
    }

    // Mark messages as read for the current user
    const unreadMessages = threadMessages.filter(msg =>
      msg.to._id.toString() === req.user.id && !msg.read
    );

    if (unreadMessages.length > 0) {
      await Message.updateMany(
        {
          _id: { $in: unreadMessages.map(msg => msg._id) },
          to: req.user.id
        },
        {
          read: true,
          readAt: new Date()
        }
      );
    }

    res.json({
      success: true,
      messages: threadMessages
    });
  } catch (error) {
    console.error('Error fetching thread messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch thread messages'
    });
  }
});

// PUT /messages/:id/read - Mark message as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Only recipient can mark as read
    if (message.to.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    message.read = true;
    await message.save();
    
    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark message as read'
    });
  }
});

// PUT /messages/mark-all-read - Mark all messages as read
router.put('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    await Message.updateMany(
      { to: req.user.id, read: false },
      { read: true }
    );
    
    res.json({
      success: true,
      message: 'All messages marked as read'
    });
  } catch (error) {
    console.error('Error marking all messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all messages as read'
    });
  }
});

// DELETE /messages/:id - Delete message
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Only sender or recipient can delete
    if (message.from.toString() !== req.user.id && message.to.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    await Message.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message'
    });
  }
});

// GET /messages/users - Get users that can be messaged
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    // Build search query
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    let users = [];

    if (req.user.role === 'teacher') {
      // Teachers can message students in their courses and other teachers
      const teacherCourses = await Course.find({ teacher: req.user.id }).select('_id');
      const courseIds = teacherCourses.map(c => c._id);

      // Get students from teacher's courses
      const studentIds = await Course.distinct('enrolledStudents', { _id: { $in: courseIds } });

      // Get students and teachers (excluding current user)
      users = await User.find({
        ...query,
        _id: { $ne: req.user.id },
        $or: [
          { _id: { $in: studentIds } },
          { role: 'teacher' }
        ]
      }).select('name email role avatar');

    } else if (req.user.role === 'student') {
      // Students can message teachers of their courses
      const studentCourses = await Course.find({
        enrolledStudents: req.user.id
      }).populate('teacher', 'name email role avatar');

      users = studentCourses.map(course => course.teacher).filter(teacher =>
        !search ||
        teacher.name.toLowerCase().includes(search.toLowerCase()) ||
        teacher.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Helper function to check messaging permissions
async function checkMessagingPermissions(userId, recipientId) {
  try {
    const user = await User.findById(userId);
    const recipient = await User.findById(recipientId);
    
    if (!user || !recipient) return false;
    
    // Teachers can message any student in their courses
    if (user.role === 'teacher' && recipient.role === 'student') {
      const teacherCourses = await Course.find({ teacher: userId }).select('_id');
      const courseIds = teacherCourses.map(c => c._id);
      
      const studentInCourses = await Course.findOne({
        _id: { $in: courseIds },
        enrolledStudents: recipientId
      });
      
      return !!studentInCourses;
    }
    
    // Students can message teachers of their courses
    if (user.role === 'student' && recipient.role === 'teacher') {
      const studentCourses = await Course.find({ 
        enrolledStudents: userId,
        teacher: recipientId 
      });
      
      return studentCourses.length > 0;
    }
    
    // Teachers can message other teachers
    if (user.role === 'teacher' && recipient.role === 'teacher') {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking messaging permissions:', error);
    return false;
  }
}

module.exports = router;
