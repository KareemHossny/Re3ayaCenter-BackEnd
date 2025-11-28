const Specialization = require('../models/Specialization');
const { cloudinary } = require('../config/cloudinary');

// الحصول على جميع التخصصات
const getSpecializations = async (req, res) => {
  try {
    const specializations = await Specialization.find({ isActive: true })
      .populate('createdBy', 'name')
      .select('name description image createdAt') // تأكد من تضمين image
      .sort({ name: 1 });
    
    res.json({
      success: true,
      data: specializations
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

// رفع صورة للتخصص
const uploadSpecializationImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'لم يتم اختيار صورة' 
      });
    }

    const specialization = await Specialization.findById(req.params.id);
    
    if (!specialization) {
      // حذف الملف من Cloudinary إذا لم يكن التخصص موجوداً
      await cloudinary.uploader.destroy(req.file.filename);
      return res.status(404).json({ 
        success: false,
        message: 'التخصص غير موجود' 
      });
    }

    // حذف الصورة القديمة من Cloudinary إذا كانت موجودة
    if (specialization.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(specialization.imagePublicId);
      } catch (error) {
        console.log('Error deleting old image from Cloudinary:', error);
      }
    }

    // تحديث مسار الصورة في قاعدة البيانات
    specialization.image = req.file.path;
    specialization.imagePublicId = req.file.filename;
    await specialization.save();

    res.json({
      success: true,
      message: 'تم رفع صورة التخصص بنجاح',
      image: specialization.image
    });

  } catch (error) {
    // حذف الملف من Cloudinary في حالة حدوث خطأ
    if (req.file) {
      try {
        await cloudinary.uploader.destroy(req.file.filename);
      } catch (deleteError) {
        console.log('Error deleting file from Cloudinary:', deleteError);
      }
    }
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

// حذف صورة التخصص
const deleteSpecializationImage = async (req, res) => {
  try {
    const specialization = await Specialization.findById(req.params.id);

    if (!specialization || !specialization.imagePublicId) {
      return res.status(400).json({ 
        success: false,
        message: 'لا توجد صورة لحذفها' 
      });
    }

    // حذف الملف من Cloudinary
    try {
      await cloudinary.uploader.destroy(specialization.imagePublicId);
    } catch (error) {
      console.log('Error deleting image from Cloudinary:', error);
    }

    // تحديث قاعدة البيانات
    specialization.image = null;
    specialization.imagePublicId = null;
    await specialization.save();

    res.json({ 
      success: true,
      message: 'تم حذف صورة التخصص بنجاح' 
    });

  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

// تحديث تخصص
const updateSpecialization = async (req, res) => {
  try {
    const specialization = await Specialization.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!specialization) {
      return res.status(404).json({ 
        success: false,
        message: 'التخصص غير موجود' 
      });
    }
    
    res.json({
      success: true,
      data: specialization
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

// حذف تخصص
const deleteSpecialization = async (req, res) => {
  try {
    const specialization = await Specialization.findById(req.params.id);
    
    if (!specialization) {
      return res.status(404).json({ 
        success: false,
        message: 'التخصص غير موجود' 
      });
    }

    // حذف الصورة من Cloudinary إذا كانت موجودة
    if (specialization.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(specialization.imagePublicId);
      } catch (error) {
        console.log('Error deleting image from Cloudinary:', error);
      }
    }

    // Soft delete
    specialization.isActive = false;
    await specialization.save();
    
    res.json({ 
      success: true,
      message: 'تم حذف التخصص بنجاح' 
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

module.exports = {
  getSpecializations,
  updateSpecialization,
  deleteSpecialization,
  uploadSpecializationImage,
  deleteSpecializationImage
};