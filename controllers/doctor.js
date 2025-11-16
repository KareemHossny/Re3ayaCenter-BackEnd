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

// تحديث بيانات الطبيب
const updateDoctorProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;

    const doctor = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone },
      { new: true }
    ).select('-password').populate('specialization', 'name');

    res.json({ message: 'تم تحديث الملف الشخصي بنجاح', doctor });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// تحديث تخصص الطبيب
const updateDoctorSpecialization = async (req, res) => {
  try {
    const { specialization } = req.body;

    if (specialization) {
      const specExists = await Specialization.findById(specialization);
      if (!specExists) {
        return res.status(404).json({ message: 'التخصص غير موجود' });
      }
    }

    const doctor = await User.findByIdAndUpdate(
      req.user._id,
      { specialization: specialization || null },
      { new: true, runValidators: true }
    )
    .select('-password')
    .populate('specialization', 'name description');

    res.json({ 
      message: 'تم تحديث التخصص بنجاح', 
      doctor 
    });
  } catch (error) {
    console.error('Error updating specialization:', error);
    res.status(400).json({ 
      message: error.message || 'فشل في تحديث التخصص' 
    });
  }
};

// الحصول على مواعيد الطبيب
const getDoctorAppointments = async (req, res) => {
  try {
    const { status, date } = req.query;
    
    let filter = { doctor: req.user._id };
    
    if (status) {
      filter.status = status;
    }
    
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      
      filter.date = {
        $gte: startDate,
        $lt: endDate
      };
    }

    const appointments = await Appointment.find(filter)
      .populate('patient', 'name email phone')
      .populate('specialization', 'name')
      .sort({ date: 1, time: 1 });

    res.json(appointments);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// الحصول على تفاصيل موعد معين
const getAppointmentDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findOne({
      _id: id,
      doctor: req.user._id
    })
    .populate('patient', 'name email phone')
    .populate('specialization', 'name');

    if (!appointment) {
      return res.status(404).json({ message: 'الموعد غير موجود' });
    }

    res.json(appointment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// إلغاء موعد من قبل الطبيب
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

// إكمال الموعد وإضافة روشتة
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

    // تحديث حالة الموعد
    appointment.status = 'completed';
    appointment.prescription = prescription;
    appointment.notes = notes;
    appointment.completedAt = new Date();

    await appointment.save();

    // إرجاع البيانات مع معلومات إضافية
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

// الحصول على إحصائيات الطبيب
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

    // المواعيد القادمة (اليوم والغد)
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

// الحصول على المواعيد المتاحة للطبيب
const getDoctorAvailability = async (req, res) => {
  try {
    const doctor = await User.findById(req.user._id).select('availability');
    res.json(doctor.availability);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// تحديث المواعيد المتاحة للطبيب
const updateDoctorAvailability = async (req, res) => {
  try {
    const { availability } = req.body;

    // التحقق من صحة البيانات
    if (!Array.isArray(availability)) {
      return res.status(400).json({ message: 'بيانات غير صحيحة' });
    }

    // تنظيف البيانات - إزالة الأيام بدون slots
    const cleanedAvailability = availability.filter(day => 
      day.slots && day.slots.length > 0
    );

    const doctor = await User.findByIdAndUpdate(
      req.user._id,
      { availability: cleanedAvailability },
      { new: true, runValidators: true }
    ).select('availability');

    res.json({ 
      message: 'تم تحديث المواعيد المتاحة بنجاح', 
      availability: doctor.availability 
    });
  } catch (error) {
    console.error('Error updating availability:', error);
    res.status(400).json({ 
      message: error.message || 'فشل في تحديث المواعيد المتاحة' 
    });
  }
};

module.exports = {
  updateDoctorProfile,
  getDoctorAppointments,
  cancelAppointment,
  getDoctorStats,
  getDoctorAvailability,
  updateDoctorAvailability,
  getDoctorProfile,
  updateDoctorSpecialization,
  completeAppointment,
  getAppointmentDetails
};