const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user || !req.user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'المستخدم غير نشط'
        });
      }

      next();
    } catch (error) {
      console.error('Auth Error:', error.message);
      return res.status(401).json({
        success: false,
        message: 'ليس مصرحًا'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'ليس مصرحًا، لا يوجد توكن'
    });
  }
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

module.exports = { protect, generateToken };