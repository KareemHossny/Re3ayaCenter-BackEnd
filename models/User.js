const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'الاسم مطلوب'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'البريد الإلكتروني مطلوب'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return this.authProvider === 'local';
    },
    minlength: 6
  },
  age: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true; // غير مطلوب لمستخدمي Google
        return /^\d+$/.test(v) && parseInt(v) > 0 && parseInt(v) < 150;
      },
      message: 'العمر يجب أن يكون رقمًا صحيحًا بين 1 و 150'
    }
  },
  role: {
    type: String,
    enum: ['patient', 'doctor', 'admin'],
    default: 'patient'
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  profileImage: {
    type: String, // سيخزن URL الصورة من Cloudinary
  },
  profileImagePublicId: {
    type: String, // سيخزن Public ID للصورة في Cloudinary
  },
  specialization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Specialization'
  },
  experienceYears: {
    type: Number,
    min: 0,
    max: 60,
    default: 0
  },
  phone: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// تشفير كلمة المرور قبل الحفظ (للمستخدمين المحليين فقط)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || this.authProvider !== 'local') {
    return next();
  }
  
  if (this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// مقارنة كلمة المرور
userSchema.methods.matchPassword = async function(enteredPassword) {
  if (this.authProvider !== 'local') {
    return false; // لمستخدمي Google، لا نقارن كلمات المرور
  }
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);