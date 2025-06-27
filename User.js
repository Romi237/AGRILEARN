const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher'], required: true },
  expertise: { type: String },
  experience: { type: String },
  profilePicture: { type: String },
  createdAt: { type: Date, default: Date.now },
  subscription: { type: String, default: 'free' }
});

module.exports = mongoose.model('User', userSchema);