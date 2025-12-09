const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Specialization = require('../models/Specialization');

// الحصول على بيانات الطبيب الشخصية
const getDoctorProfile = async (req, res) => {
  try {
    const doctor = await User.findById(req.user._id)
      .select('-password')
      .populate('specialization', 'name description');

    res.json(doctor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// تحديث بيانات الطبيب (مدمج - شامل للبيانات الأساسية والتخصص والصورة)
const updateDoctorProfile = async (req, res) => {
  try {
    const { 
      name, 
      phone, 
      specialization, 
      experienceYears,
      profileImage 
    } = req.body;

    // التحقق من صحة سنوات الخبرة
    if (experienceYears && (experienceYears < 0 || experienceYears > 60)) {
      return res.status(400).json({
        success: false,
        message: 'سنوات الخبرة يجب أن تكون بين 0 و 60 سنة'
      });
    }

    // التحقق من وجود التخصص إذا تم إرساله
    if (specialization) {
      const specExists = await Specialization.findById(specialization);
      if (!specExists) {
        return res.status(404).json({
          success: false,
          message: 'التخصص غير موجود'
        });
      }
    }

    // بناء كائن التحديث - فقط الحقول المرسلة
    const updateData = {};
    
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (experienceYears !== undefined) updateData.experienceYears = experienceYears;
    if (specialization !== undefined) updateData.specialization = specialization;
    if (profileImage !== undefined) updateData.profileImage = profileImage;

    // إذا لم يتم إرسال أي بيانات للتحديث
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم إرسال أي بيانات للتحديث'
      });
    }

    const doctor = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    )
    .select('-password')
    .populate('specialization', 'name description');

    res.json({
      success: true,
      message: 'تم تحديث الملف الشخصي بنجاح',
      data: doctor
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// باقي الدوال تبقى كما هي بدون تغيير
const getDoctorAppointments = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { date, status } = req.query;
    
    const query = { doctor: doctorId };
    
    if (date) {
      query.date = new Date(date);
    }
    
    if (status) {
      query.status = status;
    }
    
    const appointments = await Appointment.find(query)
      .populate('patient', 'name email age phone profileImage')
      .populate('specialization', 'name')
      .sort({ date: 1, time: 1 });
    
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

const getAppointmentDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findOne({
      _id: id,
      doctor: req.user._id
    })
    .populate('patient', 'name email phone age')
    .populate('specialization', 'name');

    if (!appointment) {
      return res.status(404).json({ message: 'الموعد غير موجود' });
    }

    res.json(appointment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellationReason } = req.body;

    const appointment = await Appointment.findOne({
      _id: id,
      doctor: req.user._id
    });

    if (!appointment) {
      return res.status(404).json({ message: 'الموعد غير موجود' });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({ message: 'هذا الموعد ملغي بالفعل' });
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

const completeAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { prescription, notes } = req.body;

    const appointment = await Appointment.findOne({
      _id: id,
      doctor: req.user._id
    });

    if (!appointment) {
      return res.status(404).json({ message: 'الموعد غير موجود' });
    }

    if (appointment.status === 'completed') {
      return res.status(400).json({ message: 'هذا الموعد مكتمل بالفعل' });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({ message: 'لا يمكن إكمال موعد ملغي' });
    }

    appointment.status = 'completed';
    appointment.prescription = prescription;
    appointment.notes = notes;
    appointment.completedAt = new Date();

    await appointment.save();

    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate('patient', 'name email phone')
      .populate('doctor', 'name specialization')
      .populate('specialization', 'name');

    res.json({ 
      message: 'تم تحديث حالة الموعد بنجاح وإضافة الروشتة', 
      appointment: updatedAppointment 
    });
  } catch (error) {
    console.error('Error completing appointment:', error);
    res.status(400).json({ message: error.message });
  }
};

const getDoctorStats = async (req, res) => {
  try {
    const doctorId = req.user._id;
    
    const totalAppointments = await Appointment.countDocuments({ doctor: doctorId });
    const scheduledAppointments = await Appointment.countDocuments({ 
      doctor: doctorId, 
      status: 'scheduled' 
    });
    const completedAppointments = await Appointment.countDocuments({ 
      doctor: doctorId, 
      status: 'completed' 
    });
    const cancelledAppointments = await Appointment.countDocuments({ 
      doctor: doctorId, 
      status: 'cancelled' 
    });

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAppointments = await Appointment.countDocuments({
      doctor: doctorId,
      date: {
        $gte: today,
        $lt: tomorrow
      },
      status: 'scheduled'
    });

    res.json({
      totalAppointments,
      scheduledAppointments,
      completedAppointments,
      cancelledAppointments,
      todayAppointments
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  updateDoctorProfile, // الدالة المدمجة الجديدة
  getDoctorAppointments,
  cancelAppointment,
  getDoctorStats,
  getDoctorProfile,
  completeAppointment,
  getAppointmentDetails
  // تم إزالة updateDoctorSpecialization لأنها مدمجة الآن
};