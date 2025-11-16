const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // الحصول على التوكن من الهيدر
      token = req.headers.authorization.split(' ')[1];

      // التحقق من التوكن
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // الحصول على بيانات المستخدم من التوكن
      req.user = await User.findById(decoded.id).select('-password');
      
      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'ليس مصرحًا، فشل التوكن' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'ليس مصرحًا، لا يوجد توكن' });
  }
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

module.exports = { protect, generateToken };