const express = require('express');
const {
  updateDoctorProfile,
  getDoctorAppointments,
  cancelAppointment,
  getDoctorStats,
  getDoctorProfile,
  completeAppointment,
  getAppointmentDetails
} = require('../controllers/doctor');
const doctorScheduleController = require('../controllers/doctorScheduleController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

const router = express.Router();

// جميع routes تتطلب صلاحيات طبيب
router.use(protect);
router.use(authorize('doctor'));

// ملف الطبيب الشخصي
router.get('/profile', getDoctorProfile);
router.put('/profile', updateDoctorProfile);

// المواعيد
router.get('/appointments', getDoctorAppointments);
router.get('/appointments/:id', getAppointmentDetails);
router.put('/appointments/:id/cancel', cancelAppointment);
router.put('/appointments/:id/complete', completeAppointment);

// الإحصائيات
router.get('/stats', getDoctorStats);

// إدارة الجدول الزمني
router.post('/schedule', doctorScheduleController.saveSchedule);      // حفظ الجدول
router.get('/schedule', doctorScheduleController.getSchedule);        // جلب جدول يوم معين
// router.get('/schedules', doctorScheduleController.getAllSchedules);   // جلب جميع الجداول (جديدة)

module.exports = router;