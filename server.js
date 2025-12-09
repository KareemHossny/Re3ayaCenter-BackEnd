const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const hpp = require('hpp');
const path = require('path');

// تحميل متغيرات البيئة
dotenv.config();
connectDB();

const app = express();

// ========== الأمان الأساسي ========== //
app.use(express.json({ limit: '10mb', strict: true }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://reaaya-center.vercel.app'
  ],
  credentials: true
}));



// Rate Limiting أساسي
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 1000 // زيادة الحد ليتناسب مع Vercel
});
app.use('/api/', limiter);

// الملفات الثابتة (للتطوير المحلي فقط)
if (process.env.NODE_ENV === 'development') {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/doctor', require('./routes/doctor'));
app.use('/api/patient', require('./routes/patient'));
app.use('/api/specializations', require('./routes/specialization'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/public', require('./routes/public'));

app.use(hpp({}));


// Route الأساسي
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to Re3aya Center Appointment System API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

const PORT = process.env.PORT || 5000;

// التصدير لـ Vercel
module.exports = app;

// التشغيل المحلي فقط
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });