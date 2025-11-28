const User = require('../models/User');
const { cloudinary } = require('../config/cloudinary');

// رفع صورة البروفايل للطبيب إلى Cloudinary
const uploadProfileImage = async (req, res) => {
  try {
    console.log('Upload request received - File:', req.file);
    console.log('Upload request received - User:', req.user._id);

    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'لم يتم اختيار صورة' 
      });
    }

    // التحقق من أن المستخدم طبيب
    if (req.user.role !== 'doctor') {
      // حذف الملف المرفوع إذا لم يكن المستخدم طبيباً
      if (req.file && req.file.filename) {
        try {
          await cloudinary.uploader.destroy(req.file.filename);
        } catch (deleteError) {
          console.log('Error deleting uploaded file:', deleteError);
        }
      }
      return res.status(403).json({ 
        success: false,
        message: 'مسموح للأطباء فقط برفع الصور' 
      });
    }

    const doctor = await User.findById(req.user._id);
    if (!doctor) {
      // حذف الملف المرفوع إذا لم يوجد الطبيب
      if (req.file && req.file.filename) {
        try {
          await cloudinary.uploader.destroy(req.file.filename);
        } catch (deleteError) {
          console.log('Error deleting uploaded file:', deleteError);
        }
      }
      return res.status(404).json({
        success: false,
        message: 'الطبيب غير موجود'
      });
    }

    // حذف الصورة القديمة من Cloudinary إذا كانت موجودة
    if (doctor.profileImagePublicId) {
      try {
        await cloudinary.uploader.destroy(doctor.profileImagePublicId);
        console.log('Old image deleted:', doctor.profileImagePublicId);
      } catch (error) {
        console.log('Error deleting old image:', error);
        // لا نوقف العملية إذا فشل حذف الصورة القديمة
      }
    }

    // تحديث مسار الصورة في قاعدة البيانات
    doctor.profileImage = req.file.path; // URL من Cloudinary
    doctor.profileImagePublicId = req.file.filename; // Public ID
    await doctor.save();

    console.log('Image uploaded successfully - URL:', doctor.profileImage);
    console.log('Image uploaded successfully - Public ID:', doctor.profileImagePublicId);

    res.json({
      success: true,
      message: 'تم رفع الصورة بنجاح',
      profileImage: doctor.profileImage
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // حذف الملف المرفوع في حالة الخطأ
    if (req.file && req.file.filename) {
      try {
        await cloudinary.uploader.destroy(req.file.filename);
      } catch (deleteError) {
        console.log('Error deleting uploaded file after error:', deleteError);
      }
    }
    
    res.status(400).json({ 
      success: false,
      message: error.message || 'فشل في رفع الصورة' 
    });
  }
};

// حذف صورة البروفايل من Cloudinary
const deleteProfileImage = async (req, res) => {
  try {
    const doctor = await User.findById(req.user._id);

    if (!doctor.profileImage || !doctor.profileImagePublicId) {
      return res.status(400).json({ 
        success: false,
        message: 'لا توجد صورة لحذفها' 
      });
    }

    console.log('Deleting image - Public ID:', doctor.profileImagePublicId);

    // حذف الملف من Cloudinary
    try {
      const result = await cloudinary.uploader.destroy(doctor.profileImagePublicId);
      console.log('Cloudinary delete result:', result);
    } catch (error) {
      console.log('Error deleting image from Cloudinary:', error);
      // نستمر في العملية حتى لو فشل الحذف من Cloudinary
    }

    // تحديث قاعدة البيانات
    doctor.profileImage = undefined;
    doctor.profileImagePublicId = undefined;
    await doctor.save();

    res.json({ 
      success: true,
      message: 'تم حذف الصورة بنجاح' 
    });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(400).json({ 
      success: false,
      message: error.message || 'فشل في حذف الصورة' 
    });
  }
};

// الحصول على صورة البروفايل
const getProfileImage = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('profileImage role name');

    if (!user || user.role !== 'doctor' || !user.profileImage) {
      return res.status(404).json({
        success: false,
        message: 'الصورة غير موجودة'
      });
    }

    res.json({
      success: true,
      profileImage: user.profileImage
    });

  } catch (error) {
    console.error('Get image error:', error);
    res.status(400).json({ 
      success: false,
      message: error.message || 'فشل في جلب الصورة' 
    });
  }
};

module.exports = {
  uploadProfileImage,
  deleteProfileImage,
  getProfileImage
};