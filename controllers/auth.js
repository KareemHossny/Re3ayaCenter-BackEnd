const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

// تسجيل مستخدم جديد
const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // التحقق من وجود المستخدم
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'البريد الإلكتروني مسجل مسبقًا' });
    }

    // إنشاء المستخدم (دور المريض افتراضيًا)
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: 'patient' // default role
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// تسجيل الدخول
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // التحقق من البريد الإلكتروني وكلمة المرور
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        specialization: user.specialization,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'بريد إلكتروني أو كلمة مرور غير صحيحة' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// الحصول على بيانات المستخدم الحالي
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { register, login, getMe };