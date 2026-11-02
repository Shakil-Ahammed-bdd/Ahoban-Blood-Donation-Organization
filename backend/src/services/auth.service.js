const bcrypt = require('bcryptjs')
const { randomBytes } = require('node:crypto')
const mongoose = require('mongoose')
const User = require('../models/User')
const HttpError = require('../errors/http-error')
const { isAvailableToDonate } = require('../utils/donation-eligibility')
const { validateAdminCreation } = require('../utils/auth-validation')

const PASSWORD_ROUNDS = 12
const USER_ROLES = new Set(['user', 'admin', 'super_admin'])

function ensureDatabase() {
  if (mongoose.connection.readyState !== 1) {
    throw new HttpError(503, 'DATABASE_UNAVAILABLE', 'Authentication is temporarily unavailable.')
  }
}

function normalizeRole(role) {
  return USER_ROLES.has(role) ? role : 'user'
}

function isAdminRole(role) {
  return role === 'admin' || role === 'super_admin'
}

function toPublicUser(user) {
  const role = normalizeRole(user.role)
  return {
    id: String(user._id || user.id),
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
    role,
    isAdmin: isAdminRole(role),
    isSuperAdmin: role === 'super_admin',
    isActive: user.isActive !== false,
  }
}

function isDuplicateKey(error, key) {
  return error?.code === 11000 && Object.hasOwn(error.keyPattern || {}, key)
}

function buildUserId(prefix = 'AHB') {
  return `${prefix}-${randomBytes(8).toString('hex').toUpperCase()}`
}

async function registerUser(input) {
  ensureDatabase()
  const safeInput = { ...input }
  delete safeInput.role
  delete safeInput.isActive
  delete safeInput.permissions
  const passwordHash = await bcrypt.hash(safeInput.password, PASSWORD_ROUNDS)
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const user = new User({
      ...safeInput,
      email: safeInput.email.toLowerCase(),
      userId: buildUserId(),
      role: 'user',
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

async function createAdminAccount(input) {
  ensureDatabase()
  const safeInput = validateAdminCreation(input)
  const existing = await User.findOne({ email: safeInput.email })
  if (existing) {
    throw new HttpError(409, 'EMAIL_ALREADY_REGISTERED', 'This email is already registered.', {
      email: 'An account with this email already exists.',
    })
  }

  const user = new User({
    fullName: safeInput.fullName,
    email: safeInput.email,
    phone: safeInput.phone,
    bloodGroup: 'O+',
    division: 'ঢাকা',
    district: 'ঢাকা',
    location: 'ঢাকা',
    isSearchable: false,
    isContactPublic: false,
    userId: buildUserId(),
    role: 'admin',
    isActive: safeInput.isActive,
    passwordHash: await bcrypt.hash(safeInput.password, PASSWORD_ROUNDS),
  })
  try {
    await user.save()
  } catch (error) {
    if (isDuplicateKey(error, 'email')) {
      throw new HttpError(409, 'EMAIL_ALREADY_REGISTERED', 'This email is already registered.', {
        email: 'An account with this email already exists.',
      })
    }
    throw error
  }
  return toPublicUser(user)
}

async function seedSuperAdmin({ fullName = 'Super Admin', email, password, phone = '01700000000', ...details } = {}) {
  ensureDatabase()
  const input = validateAdminCreation({
    fullName: String(fullName || 'Super Admin').trim() || 'Super Admin',
    email,
    phone,
    password,
  })

  const existing = await User.findOne({ role: 'super_admin' }).lean()
  if (existing) {
    return { created: false, user: toPublicUser(existing) }
  }

  const user = new User({
    userId: buildUserId(),
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    bloodGroup: details.bloodGroup || 'O+',
    division: details.division || 'ঢাকা',
    district: details.district || 'ঢাকা',
    upazila: '',
    location: details.location || 'ঢাকা',
    passwordHash: await bcrypt.hash(input.password, PASSWORD_ROUNDS),
    role: 'super_admin',
    isActive: true,
    isSearchable: false,
    isContactPublic: false,
    profilePhotoUrl: '',
    whatsappNumber: '',
    lastDonationDate: null,
    previousBloodDonations: 0,
  })
  try {
    await user.save()
    return { created: true, user: toPublicUser(user) }
  } catch (error) {
    if (error?.code === 11000 && error.keyPattern?.role) {
      const seededUser = await User.findOne({ role: 'super_admin' }).lean()
      if (seededUser) return { created: false, user: toPublicUser(seededUser) }
    }
    if (isDuplicateKey(error, 'email')) {
      throw new HttpError(409, 'EMAIL_ALREADY_REGISTERED', 'The Super Admin email is already used by another account.')
    }
    throw error
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
  if (user.isActive === false) {
    throw new HttpError(403, 'ACCOUNT_DISABLED', 'This account is disabled. Contact an administrator.')
  }
  return toPublicUser(user)
}

module.exports = { createAdminAccount, loginUser, registerUser, seedSuperAdmin, toPublicUser }
