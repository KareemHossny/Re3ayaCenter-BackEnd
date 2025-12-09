const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Specialization = require('../models/Specialization');
const DoctorSchedule = require('../models/DoctorSchedule');
// الحصول على قائمة الأطباء
const getDoctors = async (req, res) => {
  try {
    const { specialization, search } = req.query;
    
    let filter = { role: 'doctor', isActive: true };
    
    if (specialization) {
      filter.specialization = specialization;
    }
    
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const doctors = await User.find(filter)
      .select('-password -availability')
      .populate('specialization', 'name')
      .sort({ name: 1 });

    res.json(doctors);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const bookAppointment = async (req, res) => {
  try {
    console.log("📩 بيانات الحجز:", req.body);

    const { doctorId, specializationId, date, time, notes } = req.body;
    const patientId = req.user._id;

    if (!doctorId || !specializationId || !date || !time) {
      console.log("❌ بعض البيانات ناقصة:", { doctorId, specializationId, date, time });
      return res.status(400).json({
        success: false,
        message: 'يجب إدخال كل البيانات المطلوبة'
      });
    }

    // 1️⃣ التحقق من وجود المريض
    const patient = await User.findById(patientId);
    if (!patient) {
      console.log("❌ المريض غير موجود");
      return res.status(404).json({
        success: false,
        message: 'المريض غير موجود'
      });
    }
    console.log("✅ تحقق 1: المريض موجود");

    // 2️⃣ التحقق من وجود الطبيب
    const doctor = await User.findOne({
      _id: doctorId,
      role: 'doctor',
      specialization: specializationId
    });
    if (!doctor) {
      console.log("❌ الطبيب غير موجود أو التخصص غير مطابق");
      return res.status(404).json({
        success: false,
        message: 'الطبيب غير موجود أو التخصص غير متطابق'
      });
    }
    console.log("✅ تحقق 2: الطبيب موجود");

    // 3️⃣ تجهيز التاريخ
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0); // 🔹 استخدم setHours بدل setUTCHours لتفادي فرق التوقيت
    console.log("✅ تحقق 3: التاريخ جاهز:", selectedDate);

    // 4️⃣ التأكد أن التاريخ في المستقبل
    const appointmentDateTime = new Date(`${selectedDate.toDateString()} ${time}`);
    if (appointmentDateTime < new Date()) {
      console.log("❌ الموعد في الماضي:", appointmentDateTime);
      return res.status(400).json({
        success: false,
        message: 'لا يمكن حجز موعد في الماضي'
      });
    }

    // 5️⃣ التحقق أن المريض ليس لديه موعد في نفس التوقيت
    const existingPatientAppointment = await Appointment.findOne({
      patient: patientId,
      date: selectedDate,
      time,
      status: 'scheduled'
    });
    console.log("🔎 تحقق 4: مواعيد المريض في نفس التوقيت:", existingPatientAppointment);
    if (existingPatientAppointment) {
      return res.status(400).json({
        success: false,
        message: 'لديك موعد آخر في نفس التوقيت. يرجى اختيار وقت آخر'
      });
    }

    // 6️⃣ التحقق من جدول الطبيب في DoctorSchedule
    const doctorSchedule = await DoctorSchedule.findOne({
      doctor: doctorId,
      date: {
        $gte: new Date(selectedDate.setHours(0, 0, 0, 0)),
        $lt: new Date(selectedDate.setHours(23, 59, 59, 999))
      }
    });
    console.log("🔎 تحقق 5: جدول الطبيب:", doctorSchedule);

    if (!doctorSchedule || !doctorSchedule.isWorkingDay) {
      console.log("❌ الطبيب غير متاح في هذا اليوم");
      return res.status(400).json({
        success: false,
        message: 'الطبيب غير متاح في هذا اليوم'
      });
    }

    // 7️⃣ تحقق أن الوقت المطلوب موجود فعلاً في المواعيد المتاحة
    console.log("🔎 تحقق 6: المواعيد المتاحة:", doctorSchedule.availableTimes);
    if (!doctorSchedule.availableTimes.includes(time)) {
      console.log("❌ الوقت غير موجود ضمن المواعيد المتاحة:", time);
      return res.status(400).json({
        success: false,
        message: 'هذا الموعد غير متاح'
      });
    }

    // 8️⃣ التحقق من عدم وجود حجز مسبق لهذا الطبيب في نفس الوقت
    const existingDoctorAppointment = await Appointment.findOne({
      doctor: doctorId,
      date: selectedDate,
      time,
      status: 'scheduled'
    });
    console.log("🔎 تحقق 7: حجز الطبيب في نفس الوقت:", existingDoctorAppointment);
    if (existingDoctorAppointment) {
      console.log("❌ الطبيب لديه حجز في نفس التوقيت");
      return res.status(400).json({
        success: false,
        message: 'هذا الموعد محجوز بالفعل. يرجى اختيار وقت آخر'
      });
    }

    // 9️⃣ إنشاء الموعد
    const appointment = await Appointment.create({
      patient: patientId,
      doctor: doctorId,
      specialization: specializationId,
      date: selectedDate,
      time,
      notes
    });
    console.log("✅ تم إنشاء الموعد:", appointment);

    // 🔟 إرجاع الموعد الجديد مع البيانات المرتبطة
    const newAppointment = await Appointment.findById(appointment._id)
      .populate('doctor', 'name email profileImage experienceYears')
      .populate('specialization', 'name')
      .populate('patient', 'name email age phone');

    console.log("🎉 الموعد الجديد:", newAppointment);

    res.status(201).json({
      success: true,
      message: 'تم حجز الموعد بنجاح',
      data: newAppointment
    });

  } catch (error) {
    console.error('❌ خطأ في الحجز:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'هذا الموعد محجوز بالفعل'
      });
    }
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// الحصول على مواعيد المريض
const getPatientAppointments = async (req, res) => {
  try {
    const { status } = req.query;
    
    let filter = { patient: req.user._id };
    
    if (status) {
      filter.status = status;
    }

    const appointments = await Appointment.find(filter)
      .populate('doctor', 'name email phone profileImage experienceYears')
      .populate('specialization', 'name')
      .populate('patient', 'name email age phone') // إضافة age و phone هنا
      .sort({ date: -1, time: -1 });

    res.json({
      success: true,
      data: appointments
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};


// إلغاء موعد من قبل المريض
const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellationReason } = req.body;

    const appointment = await Appointment.findOne({
      _id: id,
      patient: req.user._id
    });

    if (!appointment) {
      return res.status(404).json({ message: 'الموعد غير موجود' });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({ message: 'هذا الموعد ملغي بالفعل' });
    }

    // لا يمكن إلغاء موعد مضى وقته
    const appointmentDateTime = new Date(`${appointment.date.toDateString()} ${appointment.time}`);
    if (appointmentDateTime < new Date()) {
      return res.status(400).json({ message: 'لا يمكن إلغاء موعد مضى وقته' });
    }

    appointment.status = 'cancelled';
    appointment.cancelledBy = req.user._id;
    appointment.cancellationReason = cancellationReason;

    await appointment.save();

    res.json({ message: 'تم إلغاء الموعد بنجاح', appointment });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// الحصول على إحصائيات المريض
const getPatientStats = async (req, res) => {
  try {
    const patientId = req.user._id;
    
    const totalAppointments = await Appointment.countDocuments({ patient: patientId });
    const scheduledAppointments = await Appointment.countDocuments({ 
      patient: patientId, 
      status: 'scheduled' 
    });
    const completedAppointments = await Appointment.countDocuments({ 
      patient: patientId, 
      status: 'completed' 
    });
    const cancelledAppointments = await Appointment.countDocuments({ 
      patient: patientId, 
      status: 'cancelled' 
    });

    // المواعيد القادمة
    const today = new Date();
    const upcomingAppointments = await Appointment.countDocuments({
      patient: patientId,
      date: { $gte: today },
      status: 'scheduled'
    });

    res.json({
      totalAppointments,
      scheduledAppointments,
      completedAppointments,
      cancelledAppointments,
      upcomingAppointments
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// الحصول على تفاصيل طبيب معين
const getDoctorDetails = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const doctor = await User.findOne({ 
      _id: doctorId, 
      role: 'doctor',
      isActive: true 
    })
    .select('-password')
    .populate('specialization', 'name description');

    if (!doctor) {
      return res.status(404).json({ message: 'الطبيب غير موجود' });
    }

    res.json(doctor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'التاريخ مطلوب'
      });
    }

    // تحويل التاريخ إلى بداية اليوم (UTC)
    const scheduleDate = new Date(date);
    scheduleDate.setUTCHours(0, 0, 0, 0);

    // جلب جدول الطبيب لليوم المطلوب
    const schedule = await DoctorSchedule.findOne({
      doctor: doctorId,
      date: scheduleDate
    });

    if (!schedule || !schedule.isWorkingDay) {
      return res.json([]); // يوم إجازة أو لا يوجد جدول
    }

    // جلب المواعيد المحجوزة لهذا اليوم
    const appointments = await Appointment.find({
      doctor: doctorId,
      date: scheduleDate,
      status: 'scheduled'
    }).select('time');

    const bookedTimes = appointments.map(a => a.time);

    // المواعيد المتاحة فقط
    const availableSlots = schedule.availableTimes.filter(
      time => !bookedTimes.includes(time)
    );

    res.json(availableSlots);
  } catch (error) {
    console.error('❌ خطأ في جلب المواعيد المتاحة:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب المواعيد المتاحة'
    });
  }
};
module.exports = {
  getDoctors,
  bookAppointment,
  getPatientAppointments,
  cancelAppointment,
  getPatientStats,
  getDoctorDetails,
  getAvailableSlots
};