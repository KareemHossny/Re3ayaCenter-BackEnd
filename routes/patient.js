const express = require('express');
const {
  getDoctors,
  bookAppointment,
  getPatientAppointments,
  cancelAppointment,
  getPatientStats,
  getDoctorDetails,
  getAvailableSlots
} = require('../controllers/patient');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

const router = express.Router();

// جميع routes تتطلب صلاحيات مريض
router.use(protect);
router.use(authorize('patient'));

// قائمة الأطباء
router.get('/doctors', getDoctors);
router.get('/doctors/:doctorId', getDoctorDetails);

router.get('/available-slots/:doctorId', getAvailableSlots);

// حجز المواعيد
router.post('/appointments', bookAppointment);
router.get('/appointments', getPatientAppointments);
router.put('/appointments/:id/cancel', cancelAppointment);

// الإحصائيات
router.get('/stats', getPatientStats);

module.exports = router;