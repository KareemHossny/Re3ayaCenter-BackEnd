// في models/DoctorSchedule.js
const mongoose = require('mongoose');

const doctorScheduleSchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'الطبيب مطلوب']
  },
  date: {
    type: Date,
    required: [true, 'التاريخ مطلوب']
  },
  availableTimes: {
    type: [String],
    default: []
  },
  isWorkingDay: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// إزالة unique index مؤقتاً للتجربة
// doctorScheduleSchema.index({ doctor: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DoctorSchedule', doctorScheduleSchema);