const jwt = require('jsonwebtoken');
require('dotenv').config();

// Main authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token missing or malformed' 
    });
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error('JWT_SECRET not configured');
    return res.status(500).json({ 
      success: false, 
      message: 'Server configuration error' 
    });
  }

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email
    };
    next();
  });
};

// Teacher-specific middleware
const authenticateTeacher = (req, res, next) => {
  authenticateToken(req, res, () => {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ 
        success: false, 
        message: 'Teacher access required' 
      });
    }
    next();
  });
};

// Student-specific middleware
const authenticateStudent = (req, res, next) => {
  authenticateToken(req, res, () => {
    if (req.user.role !== 'student') {
      return res.status(403).json({ 
        success: false, 
        message: 'Student access required' 
      });
    }
    next();
  });
};

// Optional: Admin middleware
const authenticateAdmin = (req, res, next) => {
  authenticateToken(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }
    next();
  });
};

module.exports = {
  authenticateToken,
  authenticateTeacher,
  authenticateStudent,
  authenticateAdmin
};