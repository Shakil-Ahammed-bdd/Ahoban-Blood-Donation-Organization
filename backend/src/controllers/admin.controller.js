const adminService = require('../services/admin.service')
const HttpError = require('../errors/http-error')
const { validateAdminCreation } = require('../utils/auth-validation')

function parsePagination(query) {
  const page = Number(query.page ?? 1)
  const limit = Number(query.limit ?? 20)
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new HttpError(400, 'INVALID_PAGINATION', 'Page must be positive and limit must be from 1 to 50.')
  }
  return { page, limit }
}

async function getOverview(req, res, next) {
  try {
    res.json({ success: true, status: 'ok', overview: await adminService.getOverview() })
  } catch (error) {
    next(error)
  }
}

async function listUsers(req, res, next) {
  try {
    res.json({ success: true, status: 'ok', ...await adminService.listUsers(parsePagination(req.query)) })
  } catch (error) {
    next(error)
  }
}

async function listAdmins(req, res, next) {
  try {
    const admins = await adminService.listAdmins(req.user)
    res.json({ success: true, status: 'ok', admins })
  } catch (error) {
    next(error)
  }
}

async function createAdmin(req, res, next) {
  try {
    const payload = validateAdminCreation(req.body)
    const admin = await adminService.createAdmin(payload, req.user)
    res.status(201).json({ success: true, status: 'ok', message: 'Admin account created.', admin })
  } catch (error) {
    next(error)
  }
}

async function updateAdmin(req, res, next) {
  try {
    const admin = await adminService.updateAdmin(req.params.id, req.user, req.body || {})
    res.json({ success: true, status: 'ok', message: 'Admin account updated.', admin })
  } catch (error) {
    next(error)
  }
}

async function deleteAdmin(req, res, next) {
  try {
    const result = await adminService.deleteAdmin(req.params.id, req.user)
    res.status(200).json({ success: true, status: 'ok', message: 'Admin account deleted.', ...result })
  } catch (error) {
    next(error)
  }
}

module.exports = { createAdmin, deleteAdmin, getOverview, listAdmins, listUsers, updateAdmin }
