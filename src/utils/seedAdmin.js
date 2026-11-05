const User = require('../models/User');

const seedAdmin = async () => {
  try {
    // Check if admin already exists to avoid unnecessary deletions
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      console.log('✅ Admin user already exists');
      return;
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) {
      console.warn('Admin account was not created: configure ADMIN_EMAIL and ADMIN_PASSWORD.');
      return;
    }

    console.log('🌱 Seeding Admin User...');
    
    const admin = await User.create({
      name: 'Admin',
      email: adminEmail,
      password: adminPassword,
      role: 'admin'
    });

    console.log(`👤 Admin Created successfully: ${admin.email}`);
  } catch (err) {
    console.error(`❌ Seeding Error: ${err.message}`);
  }
};

module.exports = { seedAdmin };
