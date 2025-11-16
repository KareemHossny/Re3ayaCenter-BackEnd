const mongoose = require('mongoose');
const User = require('../models/User');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI,);

    console.log(`MongoDB Connected successfully`);

    // إنشاء المدير تلقائيًا إذا لم يكن موجودًا
    await createAdminUser();
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const createAdminUser = async () => {
  try {
    const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL });
    if (!adminExists) {
      await User.create({
        name: 'System Admin',
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        role: 'admin'
      });
      console.log('Admin user created successfully');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

module.exports = connectDB;