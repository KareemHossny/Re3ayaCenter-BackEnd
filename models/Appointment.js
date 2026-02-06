const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  specialization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Specialization',
    required: true
  },
  age: Number,
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  prescription: String,
  notes: String,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancellationReason: String,
  completedAt: Date
}, { timestamps: true });

// ✅ منع الحجز المكرر لنفس الطبيب
appointmentSchema.index({ doctor: 1, date: 1, time: 1 }, { unique: true });
// Prevent a patient from booking two appointments at the same time
appointmentSchema.index(
  { patient: 1, date: 1, time: 1 },
  { unique: true, partialFilterExpression: { status: 'scheduled' } }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
