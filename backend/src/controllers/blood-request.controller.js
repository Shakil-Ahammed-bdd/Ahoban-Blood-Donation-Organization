const HttpError = require('../errors/http-error')
const bloodRequestService = require('../services/blood-request.service')
const { BLOOD_GROUPS } = require('../utils/blood-request-validation')

function parsePagination(query) {
  const page = Number(query.page ?? 1)
  const limit = Number(query.limit ?? 12)
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 24) {
    throw new HttpError(400, 'INVALID_PAGINATION', 'Page must be positive and limit must be from 1 to 24.')
  }
  return { page, limit }
}

async function listPublic(req, res, next) {
  try {
    const { page, limit } = parsePagination(req.query)
    const { bloodGroup = '', hospitalLocation = '', status = 'active' } = req.query
    if (bloodGroup && !BLOOD_GROUPS.includes(bloodGroup)) {
      throw new HttpError(400, 'INVALID_BLOOD_GROUP', 'Select a valid blood group.')
    }
    if (!['active', 'fulfilled', 'expired', 'cancelled', 'all'].includes(status)) {
      throw new HttpError(400, 'INVALID_STATUS', 'Select a valid blood request status.')
    }
    if (typeof hospitalLocation !== 'string' || hospitalLocation.length > 100) {
      throw new HttpError(400, 'INVALID_LOCATION', 'Hospital location filter must be 100 characters or fewer.')
    }
    const result = await bloodRequestService.listRequests({
      page,
      limit,
      bloodGroup,
      hospitalLocation: hospitalLocation.trim(),
      status,
    })
    res.json({ success: true, status: 'ok', data: result, ...result })
  } catch (error) {
    next(error)
  }
}

async function create(req, res, next) {
  try {
    const result = await bloodRequestService.createRequest(req.body)
    res.status(201).json({
      success: true,
      status: 'ok',
      message: 'রক্তের আবেদনটি জমা হয়েছে। Admin অনুমোদনের পর এটি প্রকাশিত হবে।',
      data: result,
      ...result,
    })
  } catch (error) {
    next(error)
  }
}

async function updateStatus(req, res, next) {
  try {
    const request = await bloodRequestService.updateRequestStatus(req.params.id, req.body)
    res.json({
      success: true,
      status: 'ok',
      message: 'আবেদনের অবস্থা হালনাগাদ হয়েছে।',
      data: { request },
      request,
    })
  } catch (error) {
    next(error)
  }
}

async function listAdmin(req, res, next) {
  try {
    const { page, limit } = parsePagination(req.query)
    const approvalStatus = req.query.status ?? 'pending'
    if (!['pending', 'approved', 'rejected'].includes(approvalStatus)) {
      throw new HttpError(400, 'INVALID_STATUS', 'Select a valid approval status.')
    }
    const result = await bloodRequestService.listAdminRequests({ page, limit, approvalStatus })
    res.json({ success: true, status: 'ok', data: result, ...result })
  } catch (error) {
    next(error)
  }
}

async function moderate(req, res, next) {
  try {
    const { approvalStatus } = req.body || {}
    if (
      !req.body
      || typeof req.body !== 'object'
      || Array.isArray(req.body)
      || Object.keys(req.body).some((field) => field !== 'approvalStatus')
    ) {
      throw new HttpError(400, 'INVALID_BLOOD_REQUEST_STATUS', 'Provide a valid approval status.')
    }
    const request = await bloodRequestService.moderateRequest(req.params.id, approvalStatus)
    res.json({ success: true, status: 'ok', message: `Blood request ${approvalStatus}.`, data: { request }, request })
  } catch (error) {
    next(error)
  }
}

async function updateAdminStatus(req, res, next) {
  try {
    if (
      !req.body
      || typeof req.body !== 'object'
      || Array.isArray(req.body)
      || Object.keys(req.body).some((field) => field !== 'status')
    ) {
      throw new HttpError(400, 'INVALID_BLOOD_REQUEST_STATUS', 'Provide a valid request status.')
    }
    const request = await bloodRequestService.updateAdminRequestStatus(req.params.id, req.body.status)
    res.json({ success: true, status: 'ok', message: 'Blood request fulfilled.', data: { request }, request })
  } catch (error) {
    next(error)
  }
}

module.exports = { create, listAdmin, listPublic, moderate, updateAdminStatus, updateStatus }
