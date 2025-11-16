const User = require('../models/User');
const Specialization = require('../models/Specialization');
const Appointment = require('../models/Appointment');

// الحصول على جميع المستخدمين
const getUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('-password')
      .populate('specialization', 'name')
      .sort({ createdAt: -1 });
    
    res.json(users);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// تغيير دور المستخدم
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const { id } = req.params;

    if (!['patient', 'doctor', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'دور غير صحيح' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { 
        role,
        // إذا تم تغيير الدور إلى patient، إزالة التخصص
        ...(role === 'patient' && { specialization: null, availability: [] })
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    res.json({ message: 'تم تحديث دور المستخدم بنجاح', user });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// إنشاء تخصص جديد
const createSpecialization = async (req, res) => {
  try {
    const { name, description } = req.body;

    const specialization = await Specialization.create({
      name,
      description,
      createdBy: req.user._id
    });

    res.status(201).json(specialization);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'هذا التخصص مسجل مسبقًا' });
    }
    res.status(400).json({ message: error.message });
  }
};

// الحصول على جميع الإحصائيات
const getStats = async (req, res) => {
  try {
    const totalPatients = await User.countDocuments({ role: 'patient' });
    const totalDoctors = await User.countDocuments({ role: 'doctor' });
    const totalAppointments = await Appointment.countDocuments();
    const totalSpecializations = await Specialization.countDocuments();

    const recentAppointments = await Appointment.find()
      .populate('patient', 'name email')
      .populate('doctor', 'name email')
      .populate('specialization', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      totalPatients,
      totalDoctors,
      totalAppointments,
      totalSpecializations,
      recentAppointments
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
module.exports = {
  getUsers,
  updateUserRole,
  createSpecialization,
  getStats
};