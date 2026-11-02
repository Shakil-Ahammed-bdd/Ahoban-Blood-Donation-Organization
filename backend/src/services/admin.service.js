const mongoose = require('mongoose')
const User = require('../models/User')
const Experience = require('../models/Experience')
const HttpError = require('../errors/http-error')
const { createAdminAccount } = require('./auth.service')

function ensureDatabase() {
  if (mongoose.connection.readyState !== 1) {
    throw new HttpError(503, 'DATABASE_UNAVAILABLE', 'Administrative actions are temporarily unavailable.')
  }
}

function requireSuperAdmin(currentUser) {
  if (currentUser.role !== 'super_admin') {
    throw new HttpError(403, 'FORBIDDEN', 'Only the Super Admin can manage admin accounts.')
  }
}

function serializeAdmin(user) {
  return {
    id: String(user._id || user.id),
    userId: user.userId,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role || 'user',
    isActive: user.isActive !== false,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

async function getOverview() {
  ensureDatabase()
  const [totalAccounts, totalUsers, totalAdmins, activeAdmins, totalDonors, totalExperiences] =
    await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'admin', isActive: { $ne: false } }),
      User.countDocuments({ isSearchable: true }),
      Experience.countDocuments({ isPublic: true }),
    ])
  return { totalAccounts, totalUsers, totalAdmins, activeAdmins, totalDonors, totalExperiences }
}

async function listUsers({ page = 1, limit = 20 } = {}) {
  ensureDatabase()
  const skip = (page - 1) * limit
  const [users, total] = await Promise.all([
    User.find({ role: 'user' })
      .select('userId fullName email role isActive createdAt')
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments({ role: 'user' }),
  ])
  return {
    users: users.map((user) => ({
      id: String(user._id),
      userId: user.userId,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive !== false,
      createdAt: user.createdAt,
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  }
}

async function listAdmins(currentUser) {
  ensureDatabase()
  const query = currentUser.role === 'super_admin'
    ? { role: 'admin' }
    : { role: 'admin', _id: currentUser._id }

  const users = await User.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .lean()

  return users.map(serializeAdmin)
}

async function createAdmin(input, currentUser) {
  ensureDatabase()
  requireSuperAdmin(currentUser)
  return createAdminAccount(input)
}

async function updateAdmin(id, currentUser, changes = {}) {
  ensureDatabase()
  requireSuperAdmin(currentUser)
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(404, 'ADMIN_NOT_FOUND', 'The admin account was not found.')
  }

  const target = await User.findById(id)
  if (!target) {
    throw new HttpError(404, 'ADMIN_NOT_FOUND', 'The admin account was not found.')
  }
  if (target.role === 'super_admin') {
    throw new HttpError(403, 'SUPER_ADMIN_PROTECTED', 'The Super Admin account is protected.')
  }
  if (target.role !== 'admin') {
    throw new HttpError(404, 'ADMIN_NOT_FOUND', 'The admin account was not found.')
  }

  const allowedFields = new Set(['fullName', 'phone', 'isActive', 'role'])
  const unknownFields = Object.keys(changes).filter((field) => !allowedFields.has(field))
  if (unknownFields.length) {
    throw new HttpError(400, 'INVALID_ADMIN_UPDATE', 'The request contains unsupported admin fields.')
  }

  const update = {}
  if (Object.hasOwn(changes, 'fullName')) {
    if (typeof changes.fullName !== 'string' || changes.fullName.trim().length < 2 || changes.fullName.trim().length > 100) {
      throw new HttpError(400, 'INVALID_ADMIN_UPDATE', 'Enter a name between 2 and 100 characters.')
    }
    update.fullName = changes.fullName.trim()
  }
  if (Object.hasOwn(changes, 'phone')) {
    if (typeof changes.phone !== 'string' || !/^(?:\+?88)?01[3-9]\d{8}$/.test(changes.phone.replace(/[\s-]/g, ''))) {
      throw new HttpError(400, 'INVALID_ADMIN_UPDATE', 'Enter a valid Bangladesh mobile number.')
    }
    update.phone = changes.phone.replace(/[\s-]/g, '')
  }
  if (Object.hasOwn(changes, 'isActive')) {
    if (typeof changes.isActive !== 'boolean') {
      throw new HttpError(400, 'INVALID_ADMIN_UPDATE', 'isActive must be a boolean.')
    }
    update.isActive = changes.isActive
  }
  if (Object.hasOwn(changes, 'role')) {
    if (!['admin', 'user'].includes(changes.role)) {
      throw new HttpError(403, 'INVALID_ADMIN_ROLE', 'The Super Admin role cannot be assigned or changed here.')
    }
    update.role = changes.role
  }

  if (!Object.keys(update).length) return serializeAdmin(target)
  const user = await User.findOneAndUpdate(
    { _id: id, role: 'admin' },
    { $set: update },
    { returnDocument: 'after', runValidators: true },
  )
  if (!user) {
    const currentTarget = await User.findById(id).select('role')
    if (currentTarget?.role === 'super_admin') {
      throw new HttpError(403, 'SUPER_ADMIN_PROTECTED', 'The Super Admin account is protected.')
    }
    throw new HttpError(404, 'ADMIN_NOT_FOUND', 'The admin account was not found.')
  }
  return serializeAdmin(user)
}

async function deleteAdmin(id, currentUser) {
  ensureDatabase()
  requireSuperAdmin(currentUser)
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(404, 'ADMIN_NOT_FOUND', 'The admin account was not found.')
  }

  const target = await User.findById(id)
  if (!target) {
    throw new HttpError(404, 'ADMIN_NOT_FOUND', 'The admin account was not found.')
  }
  if (target.role === 'super_admin') {
    throw new HttpError(403, 'SUPER_ADMIN_PROTECTED', 'The Super Admin account cannot be deleted.')
  }
  if (target.role !== 'admin') {
    throw new HttpError(404, 'ADMIN_NOT_FOUND', 'The admin account was not found.')
  }

  const deleted = await User.findOneAndDelete({ _id: id, role: 'admin' })
  if (!deleted) {
    const currentTarget = await User.findById(id).select('role')
    if (currentTarget?.role === 'super_admin') {
      throw new HttpError(403, 'SUPER_ADMIN_PROTECTED', 'The Super Admin account cannot be deleted.')
    }
    throw new HttpError(404, 'ADMIN_NOT_FOUND', 'The admin account was not found.')
  }
  return { deleted: true, id: String(target._id) }
}

module.exports = { createAdmin, deleteAdmin, getOverview, listAdmins, listUsers, updateAdmin }
