const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const multer = require('multer');
const connectDB = require('./config/database');

// تحميل متغيرات البيئة
dotenv.config();

// الاتصال بقاعدة البيانات
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// servir الملفات الثابتة (للصور)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/doctor', require('./routes/doctor'));
app.use('/api/patient', require('./routes/patient'));
app.use('/api/specializations', require('./routes/specialization'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/public', require('./routes/public')); 

// Route أساسي للتحقق من عمل السيرفر
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to Hospital Appointment System API',
    version: '1.0.0'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});