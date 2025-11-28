const express = require('express');
const { register, login, getMe, googleAuth , updateProfile ,completeProfile} = require('../controllers/auth');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.patch('/complete-profile', protect, completeProfile);

module.exports = router;