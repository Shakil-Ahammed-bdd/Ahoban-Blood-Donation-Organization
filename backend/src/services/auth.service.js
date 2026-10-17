const bcrypt = require('bcryptjs')
const { randomBytes } = require('node:crypto')
const mongoose = require('mongoose')
const User = require('../models/User')
const HttpError = require('../errors/http-error')
const { isExperienceModerator } = require('../config/experience-moderators')
const { isAvailableToDonate } = require('../utils/donation-eligibility')

const PASSWORD_ROUNDS = 12

function ensureDatabase() {
  if (mongoose.connection.readyState !== 1) {
    throw new HttpError(503, 'DATABASE_UNAVAILABLE', 'Authentication is temporarily unavailable.')
  }
}

function toPublicUser(user) {
  return {
    id: user.id,
    userId: user.userId,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    whatsappNumber: user.whatsappNumber || '',
    bloodGroup: user.bloodGroup,
    division: user.division,
    district: user.district,
    upazila: user.upazila || '',
    location: user.location,
    lastDonationDate: user.lastDonationDate || null,
    previousBloodDonations: user.previousBloodDonations || 0,
    latitude: user.latitude ?? null,
    longitude: user.longitude ?? null,
    isAvailableToDonate: isAvailableToDonate(user.lastDonationDate),
    isSearchable: user.isSearchable,
    isContactPublic: user.isContactPublic,
    profilePhotoUrl: user.profilePhotoUrl || '',
    createdAt: user.createdAt,
    isExperienceModerator: isExperienceModerator(user),
  }
}

function isDuplicateKey(error, key) {
  return error?.code === 11000 && Object.hasOwn(error.keyPattern || {}, key)
}

async function registerUser(input) {
  ensureDatabase()
  const passwordHash = await bcrypt.hash(input.password, PASSWORD_ROUNDS)
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const user = new User({
      ...input,
      email: input.email.toLowerCase(),
      userId: `AHB-${randomBytes(8).toString('hex').toUpperCase()}`,
      passwordHash,
    })

    try {
      await user.save()
      return toPublicUser(user)
    } catch (error) {
      if (isDuplicateKey(error, 'email')) {
        throw new HttpError(409, 'EMAIL_ALREADY_REGISTERED', 'This email is already registered.', {
          email: 'An account with this email already exists.',
        })
      }
      if (isDuplicateKey(error, 'userId') && attempt < 2) continue
      if (isDuplicateKey(error, 'userId')) {
        throw new HttpError(503, 'USER_ID_GENERATION_FAILED', 'Could not generate a user ID. Please try again.')
      }
      throw error
    }
  }
}

async function loginUser(identifier, password) {
  ensureDatabase()
  const normalizedIdentifier = identifier.trim()
  const user = await User.findOne(
    normalizedIdentifier.includes('@')
      ? { email: normalizedIdentifier.toLowerCase() }
      : { userId: normalizedIdentifier.toUpperCase() },
  ).select('+passwordHash')

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email/User ID or password is incorrect.')
  }
  return toPublicUser(user)
}

module.exports = { loginUser, registerUser, toPublicUser }
