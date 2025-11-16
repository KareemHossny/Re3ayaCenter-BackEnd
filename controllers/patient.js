const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Specialization = require('../models/Specialization');

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

// الحصول على المواعيد المتاحة لطبيب معين
const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: 'التاريخ مطلوب' });
    }

    const doctor = await User.findById(doctorId).select('availability');
    if (!doctor) {
      return res.status(404).json({ message: 'الطبيب غير موجود' });
    }

    const selectedDate = new Date(date);
    const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // البحث عن اليوم في availability
    const dayAvailability = doctor.availability.find(a => a.day === dayName);
    
    if (!dayAvailability) {
      return res.json([]); // لا يوجد مواعيد متاحة في هذا اليوم
    }

    // الحصول على المواعيد المحجوزة بالفعل في هذا اليوم
    const bookedAppointments = await Appointment.find({
      doctor: doctorId,
      date: selectedDate,
      status: 'scheduled'
    }).select('time');

    const bookedSlots = bookedAppointments.map(app => app.time);

    // تصفية المواعيد المتاحة (إزالة المحجوزة)
    const availableSlots = dayAvailability.slots.filter(slot => 
      !bookedSlots.includes(slot)
    );

    res.json(availableSlots);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// حجز موعد جديد
const bookAppointment = async (req, res) => {
  try {
    const { doctorId, specializationId, date, time, notes } = req.body;

    // التحقق من وجود الطبيب
    const doctor = await User.findOne({ 
      _id: doctorId, 
      role: 'doctor',
      specialization: specializationId 
    });
    
    if (!doctor) {
      return res.status(404).json({ message: 'الطبيب غير موجود أو التخصص غير متطابق' });
    }

    // التحقق من أن الموعد متاح
    const selectedDate = new Date(date);
    const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    const dayAvailability = doctor.availability.find(a => a.day === dayName);
    if (!dayAvailability || !dayAvailability.slots.includes(time)) {
      return res.status(400).json({ message: 'هذا الموعد غير متاح' });
    }

    // التحقق من عدم وجود حجز مسبق في نفس الوقت
    const existingAppointment = await Appointment.findOne({
      doctor: doctorId,
      date: selectedDate,
      time: time,
      status: 'scheduled'
    });

    if (existingAppointment) {
      return res.status(400).json({ message: 'هذا الموعد محجوز بالفعل' });
    }

    // إنشاء الموعد
    const appointment = await Appointment.create({
      patient: req.user._id,
      doctor: doctorId,
      specialization: specializationId,
      date: selectedDate,
      time: time,
      notes: notes
    });

    // إرجاع بيانات الموعد مع معلومات إضافية
    const newAppointment = await Appointment.findById(appointment._id)
      .populate('doctor', 'name email')
      .populate('specialization', 'name');

    res.status(201).json({ 
      message: 'تم حجز الموعد بنجاح', 
      appointment: newAppointment 
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'هذا الموعد محجوز بالفعل' });
    }
    res.status(400).json({ message: error.message });
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
      .populate('doctor', 'name email phone')
      .populate('specialization', 'name')
      .sort({ date: -1, time: -1 });

    res.json(appointments);
  } catch (error) {
    res.status(400).json({ message: error.message });
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

module.exports = {
  getDoctors,
  getAvailableSlots,
  bookAppointment,
  getPatientAppointments,
  cancelAppointment,
  getPatientStats,
  getDoctorDetails
};