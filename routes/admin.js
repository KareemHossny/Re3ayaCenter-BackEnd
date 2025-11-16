const express = require('express');
const {
  getUsers,
  updateUserRole,
  createSpecialization,
  getStats
} = require('../controllers/admin');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

const router = express.Router();

// جميع routes تتطلب صلاحيات مدير
router.use(protect);
router.use(authorize('admin'));

router.get('/users', getUsers);
router.put('/users/:id/role', updateUserRole);
router.post('/specializations', createSpecialization);
router.get('/stats', getStats);

module.exports = router;