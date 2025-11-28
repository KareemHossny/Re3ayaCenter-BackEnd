const express = require('express');
const {
  getSpecializations,
  updateSpecialization,
  deleteSpecialization,
  uploadSpecializationImage,
  deleteSpecializationImage
} = require('../controllers/specialization');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const upload = require('../middleware/upload');

const router = express.Router();

// الجميع يمكنهم رؤية التخصصات
router.get('/', getSpecializations);

// رفع صورة التخصص (للمدير فقط)
router.post(
  '/:id/image',
  protect,
  authorize('admin'),
  upload.single('specializationImage'),
  uploadSpecializationImage
);

// حذف صورة التخصص (للمدير فقط)
router.delete(
  '/:id/image',
  protect,
  authorize('admin'),
  deleteSpecializationImage
);

// التحديث والحذف للمدير فقط
router.put('/:id', protect, authorize('admin'), updateSpecialization);
router.delete('/:id', protect, authorize('admin'), deleteSpecialization);

module.exports = router;