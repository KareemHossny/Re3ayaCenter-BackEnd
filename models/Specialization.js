const mongoose = require('mongoose');

const specializationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'اسم التخصص مطلوب'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Specialization', specializationSchema);