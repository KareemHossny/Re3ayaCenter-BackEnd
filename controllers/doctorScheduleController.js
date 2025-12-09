// ✅ controllers/doctorScheduleController.js (النسخة النهائية المؤكدة)
const DoctorSchedule = require('../models/DoctorSchedule');

exports.saveSchedule = async (req, res) => {
  try {
    console.log('=== 🟢 بدء حفظ الجدول ===');
    console.log('🧩 raw body:', req.body);
    console.log('🧩 typeof availableTimes:', typeof req.body.availableTimes);
    console.log('🧩 Array.isArray:', Array.isArray(req.body.availableTimes));

    const doctorId = req.user._id;
    const { date, isWorkingDay } = req.body;
    let { availableTimes } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, message: 'التاريخ مطلوب' });
    }

    // 🕓 توحيد التاريخ إلى بداية اليوم بالتوقيت العالمي
    const scheduleDate = new Date(date);
    scheduleDate.setUTCHours(0, 0, 0, 0);

    // 🧹 تنظيف المواعيد وتحويلها لمصفوفة نصوص سليمة
    let timesArray = [];
    if (Array.isArray(availableTimes)) {
      timesArray = availableTimes.map(String).filter(Boolean);
    } else if (typeof availableTimes === 'string') {
      try {
        const parsed = JSON.parse(availableTimes);
        timesArray = Array.isArray(parsed)
          ? parsed.map(String).filter(Boolean)
          : [availableTimes];
      } catch {
        timesArray = availableTimes.split(',').map(t => t.trim()).filter(Boolean);
      }
    }

    console.log('📊 سيتم حفظ', timesArray.length, 'موعد:', timesArray);

    // ✅ حفظ أو تحديث الجدول لليوم الحالي
    const result = await DoctorSchedule.updateOne(
      { doctor: doctorId, date: scheduleDate },
      {
        $set: {
          doctor: doctorId,
          date: scheduleDate,
          availableTimes: timesArray,
          isWorkingDay: Boolean(isWorkingDay)
        }
      },
      { upsert: true }
    );

    // ✅ جلب النتيجة بعد الحفظ
    const savedSchedule = await DoctorSchedule.findOne({
      doctor: doctorId,
      date: scheduleDate
    });

    console.log('💾 النتيجة بعد الحفظ:', savedSchedule);

    res.json({
      success: true,
      message: isWorkingDay
        ? `تم حفظ ${savedSchedule.availableTimes.length} موعد متاح`
        : 'تم تعيين اليوم كإجازة',
      data: savedSchedule
    });
  } catch (error) {
    console.error('❌ خطأ في حفظ الجدول:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم أثناء حفظ الجدول',
      error: error.message
    });
  }
};

// ✅ استرجاع الجدول ليوم معين
exports.getSchedule = async (req, res) => {
  try {
    const { date } = req.query;
    const doctorId = req.user._id;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'التاريخ مطلوب'
      });
    }

    const scheduleDate = new Date(date);
    scheduleDate.setUTCHours(0, 0, 0, 0);

    const schedule = await DoctorSchedule.findOne({
      doctor: doctorId,
      date: scheduleDate
    });

    res.json({
      success: true,
      data: schedule || {
        date: scheduleDate,
        availableTimes: [],
        isWorkingDay: true
      }
    });
  } catch (error) {
    console.error('❌ خطأ في جلب الجدول:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم أثناء جلب الجدول'
    });
  }
};
