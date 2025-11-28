const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { OAuth2Client } = require('google-auth-library');

// تهيئة عميل Google
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const register = async (req, res) => {
  try {
    const { name, email, password, phone, age } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'البريد الإلكتروني مسجل مسبقًا' });
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      age,
      role: 'patient',
      authProvider: 'local' // إضافة هذا الحقل
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        age: user.age,
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

// تسجيل الدخول بـ Google
const googleAuth = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'رمز Google مطلوب' });
    }

    // التحقق من رمز Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // البحث عن المستخدم في قاعدة البيانات
    let user = await User.findOne({ email });

    if (user) {
      // إذا كان المستخدم موجوداً، قم بتسجيل دخوله
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        specialization: user.specialization,
        token: generateToken(user._id),
      });
    } else {
      // إذا لم يكن موجوداً، أنشئ حساب جديد
      user = await User.create({
        name,
        email,
        password: Math.random().toString(36).slice(-16), // كلمة مرور عشوائية
        role: 'patient',
        authProvider: 'google', // إضافة حقل لتحديد مزود المصادقة
      });

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    }
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(400).json({ message: 'فشل المصادقة باستخدام Google' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, age, phone, specialization, experienceYears } = req.body;
    const userId = req.user._id;

    // إنشاء كائن البيانات للتحديث
    const updateData = {};
    
    if (name !== undefined) updateData.name = name;
    if (age !== undefined) updateData.age = age;
    if (phone !== undefined) updateData.phone = phone;
    if (specialization !== undefined) updateData.specialization = specialization;
    if (experienceYears !== undefined) updateData.experienceYears = experienceYears;

    // البحث عن المستخدم وتحديث بياناته
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { 
        new: true, // إرجاع المستخدم بعد التحديث
        runValidators: true // تشغيل الـ validators
      }
    ).select('-password'); // استبعاد كلمة المرور من النتيجة

    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    res.json({
      success: true,
      message: 'تم تحديث الملف الشخصي بنجاح',
      user
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
    // معالجة أخطاء الـ validation
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        message: 'بيانات غير صالحة',
        errors 
      });
    }

    // معالجة أخطاء الـ duplicate email
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        message: 'البريد الإلكتروني مسجل مسبقاً' 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'فشل تحديث الملف الشخصي',
      error: error.message 
    });
  }
};

// إكمال الملف الشخصي للمستخدمين الجدد (خاصة مستخدمي Google)
const completeProfile = async (req, res) => {
  try {
    const { age, phone } = req.body;
    const userId = req.user._id;

    // التحقق من وجود العمر
    if (!age) {
      return res.status(400).json({ 
        success: false,
        message: 'العمر مطلوب' 
      });
    }

    // التحقق من صحة العمر
    if (isNaN(age) || Number(age) < 1 || Number(age) > 150) {
      return res.status(400).json({ 
        success: false,
        message: 'يرجى إدخال عمر صحيح بين 1 و 150' 
      });
    }

    // تحديث بيانات المستخدم
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        $set: { 
          age,
          phone: phone || undefined
        } 
      },
      { 
        new: true,
        runValidators: true 
      }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'المستخدم غير موجود' 
      });
    }

    res.json({
      success: true,
      message: 'تم إكمال الملف الشخصي بنجاح',
      user
    });

  } catch (error) {
    console.error('Complete profile error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        message: 'بيانات غير صالحة',
        errors 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'فشل إكمال الملف الشخصي',
      error: error.message 
    });
  }
};

module.exports = { register, login, getMe, googleAuth ,completeProfile ,updateProfile};

