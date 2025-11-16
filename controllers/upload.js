const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// رفع صورة البروفايل للطبيب
const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'لم يتم اختيار صورة' });
    }

    // التحقق من أن المستخدم طبيب
    if (req.user.role !== 'doctor') {
      // حذف الملف المرفوع إذا لم يكن المستخدم طبيباً
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ message: 'مسموح للأطباء فقط برفع الصور' });
    }

    const doctor = await User.findById(req.user._id);

    // حذف الصورة القديمة إذا كانت موجودة
    if (doctor.profileImage) {
      const oldImagePath = path.join(__dirname, '../', doctor.profileImage);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // تحديث مسار الصورة في قاعدة البيانات
    doctor.profileImage = `uploads/${req.file.filename}`;
    await doctor.save();

    res.json({
      message: 'تم رفع الصورة بنجاح',
      profileImage: doctor.profileImage
    });

  } catch (error) {
    // حذف الملف في حالة حدوث خطأ
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(400).json({ message: error.message });
  }
};

// حذف صورة البروفايل
const deleteProfileImage = async (req, res) => {
  try {
    const doctor = await User.findById(req.user._id);

    if (!doctor.profileImage) {
      return res.status(400).json({ message: 'لا توجد صورة لحذفها' });
    }

    // حذف الملف من السيرفر
    const imagePath = path.join(__dirname, '../', doctor.profileImage);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // تحديث قاعدة البيانات
    doctor.profileImage = null;
    await doctor.save();

    res.json({ message: 'تم حذف الصورة بنجاح' });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// الحصول على صورة البروفايل
const getProfileImage = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('profileImage role name');

    if (!user || user.role !== 'doctor' || !user.profileImage) {
      return res.status(404).json({ message: 'الصورة غير موجودة' });
    }

    const imagePath = path.join(__dirname, '../', user.profileImage);

    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ message: 'الصورة غير موجودة' });
    }

    res.sendFile(imagePath);

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  uploadProfileImage,
  deleteProfileImage,
  getProfileImage
};