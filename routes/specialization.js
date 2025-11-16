const express = require('express');
const {
  getSpecializations,
  updateSpecialization,
  deleteSpecialization
} = require('../controllers/specialization');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

const router = express.Router();

// الجميع يمكنهم رؤية التخصصات
router.get('/', getSpecializations);

// التحديث والحذف للمدير فقط
router.put('/:id', protect, authorize('admin'), updateSpecialization);
router.delete('/:id', protect, authorize('admin'), deleteSpecialization);

module.exports = router;