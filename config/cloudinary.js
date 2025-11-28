const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// تكوين Cloudinary - استخدام متغيرات البيئة
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true // استخدام HTTPS
});

// إعداد التخزين على Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 're3aya-appointments',
    format: async (req, file) => {
      // تحويل إلى webp للحصول على أفضل ضغط
      return 'webp';
    },
    transformation: [
      { width: 800, height: 800, crop: 'limit', quality: 'auto' }
    ],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1E9);
      let type = 'general';
      
      if (req.route.path.includes('profile-image')) {
        type = 'profile';
      } else if (req.route.path.includes('specialization')) {
        type = 'specialization';
      }
      
      return `${type}-${timestamp}-${random}`;
    },
  },
});

// تصفية الملفات (الصور فقط)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('يسمح برفع الصور فقط!'), false);
  }
};

module.exports = {
  cloudinary,
  storage,
  fileFilter
};