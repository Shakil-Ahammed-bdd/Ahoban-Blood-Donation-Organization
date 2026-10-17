const mongoose = require('mongoose')
const Experience = require('../models/Experience')

async function connectDatabase(uri) {
  if (!uri) {
    console.error('MongoDB is not configured. Set MONGODB_URI in the root .env file.')
    return false
  }

  try {
    await mongoose.connect(uri)
    await Experience.collection.updateMany(
      { isPublic: { $exists: false } },
      [{ $set: { isPublic: { $eq: ['$publicConsent', true] } } }],
    )
    console.info('Connected to MongoDB.')
    return true
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`)
    return false
  }
}

module.exports = connectDatabase
