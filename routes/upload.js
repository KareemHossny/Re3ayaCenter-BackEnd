const express = require('express');
const {
  uploadProfileImage,
  deleteProfileImage,
  getProfileImage
} = require('../controllers/upload');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const upload = require('../middleware/upload');

const router = express.Router();

// رفع صورة البروفايل (للأطباء فقط)
router.post(
  '/profile-image',
  protect,
  authorize('doctor'),
  upload.single('profileImage'),
  uploadProfileImage
);

// حذف صورة البروفايل (للأطباء فقط)
router.delete(
  '/profile-image',
  protect,
  authorize('doctor'),
  deleteProfileImage
);

// الحصول على صورة البروفايل (عام - بدون مصادقة)
router.get('/profile-image/:userId', getProfileImage);

module.exports = router;