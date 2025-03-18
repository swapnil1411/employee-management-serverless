const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true, // Optional, to clean up any leading/trailing spaces
  },
  email: {
    type: String,
    unique: true, // Email should remain unique
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['Admin', 'HR', 'Employee'],
    default: 'Employee',
  },
});

const User = mongoose.model('User', userSchema);  

module.exports = User;