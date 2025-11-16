const Specialization = require('../models/Specialization');

// الحصول على جميع التخصصات
const getSpecializations = async (req, res) => {
  try {
    const specializations = await Specialization.find({ isActive: true })
      .populate('createdBy', 'name')
      .sort({ name: 1 });
    
    res.json(specializations);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// تحديث تخصص
const updateSpecialization = async (req, res) => {
  try {
    const specialization = await Specialization.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!specialization) {
      return res.status(404).json({ message: 'التخصص غير موجود' });
    }
    
    res.json(specialization);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// حذف تخصص
const deleteSpecialization = async (req, res) => {
  try {
    const specialization = await Specialization.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!specialization) {
      return res.status(404).json({ message: 'التخصص غير موجود' });
    }
    
    res.json({ message: 'تم حذف التخصص بنجاح' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getSpecializations,
  updateSpecialization,
  deleteSpecialization
};