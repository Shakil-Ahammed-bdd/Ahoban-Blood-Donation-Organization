const mongoose = require('mongoose')
const Experience = require('../models/Experience')
const User = require('../models/User')
const { seedSuperAdmin } = require('../services/auth.service')

async function connectDatabase(uri) {
  if (!uri) {
    console.error('MongoDB is not configured. Set MONGODB_URI in the root .env file.')
    return false
  }

  try {
    await mongoose.connect(uri)
    await User.collection.createIndex(
      { role: 1 },
      {
        unique: true,
        partialFilterExpression: { role: 'super_admin' },
        name: 'one_super_admin',
      },
    )
    await Experience.collection.updateMany(
      { isPublic: { $exists: false } },
      [{ $set: { isPublic: { $eq: ['$publicConsent', true] } } }],
    )
    if (process.env.SUPER_ADMIN_EMAIL && process.env.SUPER_ADMIN_PASSWORD) {
      try {
        const result = await seedSuperAdmin({
          email: process.env.SUPER_ADMIN_EMAIL,
          password: process.env.SUPER_ADMIN_PASSWORD,
          fullName: process.env.SUPER_ADMIN_NAME || 'Super Admin',
          phone: process.env.SUPER_ADMIN_PHONE || '01700000000',
          division: process.env.SUPER_ADMIN_DIVISION || 'ঢাকা',
          district: process.env.SUPER_ADMIN_DISTRICT || 'ঢাকা',
          location: process.env.SUPER_ADMIN_LOCATION || 'ঢাকা',
        })
        if (result.created) {
          console.info('Seeded the initial Super Admin account.')
        }
      } catch (error) {
        console.error(`Super Admin initialization failed (${error.code || 'configuration error'}).`)
        await mongoose.disconnect()
        return false
      }
    } else if (!(await User.exists({ role: 'super_admin' }))) {
      if (process.env.NODE_ENV === 'production') {
        console.error('No Super Admin exists. Configure SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD before startup.')
        await mongoose.disconnect()
        return false
      }
      console.warn('No Super Admin exists. Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD to initialize one.')
    }

    console.info('Connected to MongoDB.')
    return true
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`)
    return false
  }
}

module.exports = connectDatabase
