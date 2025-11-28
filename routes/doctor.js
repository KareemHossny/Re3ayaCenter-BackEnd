const express = require('express');
const {
  updateDoctorProfile,
  getDoctorAppointments,
  cancelAppointment,
  getDoctorStats,
  getDoctorAvailability,
  updateDoctorAvailability,
  getDoctorProfile,
  completeAppointment,
  getAppointmentDetails
} = require('../controllers/doctor');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

const router = express.Router();

// جميع routes تتطلب صلاحيات طبيب
router.use(protect);
router.use(authorize('doctor'));

// ملف الطبيب الشخصي - تم دمج جميع عمليات التحديث في route واحد
router.get('/profile', getDoctorProfile);
router.put('/profile', updateDoctorProfile); // تحديث شامل للبيانات

// المواعيد
router.get('/appointments', getDoctorAppointments);
router.get('/appointments/:id', getAppointmentDetails);
router.put('/appointments/:id/cancel', cancelAppointment);
router.put('/appointments/:id/complete', completeAppointment);

// الإحصائيات
router.get('/stats', getDoctorStats);

// المواعيد المتاحة
router.get('/availability', getDoctorAvailability);
router.put('/availability', updateDoctorAvailability);

module.exports = router;