const express = require('express');
const User = require('../models/User');
const Specialization = require('../models/Specialization');
const Appointment = require('../models/Appointment');

const router = express.Router();

// الحصول على قائمة الأطباء للعامة
const getPublicDoctors = async (req, res) => {
  try {
    const doctors = await User.find({ 
      role: 'doctor',
      isActive: true 
    })
    .select('name email phone specialization profileImage')
    .populate('specialization', 'name description')
    .sort({ name: 1 });

    res.json(doctors);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// الحصول على التخصصات للعامة
const getPublicSpecializations = async (req, res) => {
  try {
    const specializations = await Specialization.find({ isActive: true })
      .select('name description')
      .sort({ name: 1 });

    res.json(specializations);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// الحصول على إحصائيات المستشفى للعامة
const getPublicStats = async (req, res) => {
  try {
    const totalDoctors = await User.countDocuments({ 
      role: 'doctor', 
      isActive: true 
    });
    
    const totalSpecializations = await Specialization.countDocuments({ 
      isActive: true 
    });
    
    const totalAppointments = await Appointment.countDocuments();
    
    const totalPatients = await User.countDocuments({ 
      role: 'patient', 
      isActive: true 
    });

    res.json({
      totalDoctors,
      totalSpecializations,
      totalAppointments,
      totalPatients
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// الحصول على تفاصيل طبيب معين للعامة
const getPublicDoctorDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await User.findOne({ 
      _id: id, 
      role: 'doctor',
      isActive: true 
    })
    .select('name email phone specialization profileImage availability')
    .populate('specialization', 'name description');

    if (!doctor) {
      return res.status(404).json({ message: 'الطبيب غير موجود' });
    }

    res.json(doctor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Routes
router.get('/doctors', getPublicDoctors);
router.get('/doctors/:id', getPublicDoctorDetails);
router.get('/specializations', getPublicSpecializations);
router.get('/stats', getPublicStats);

module.exports = router;