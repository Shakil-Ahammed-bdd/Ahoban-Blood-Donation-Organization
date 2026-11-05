const { createHash, randomBytes, timingSafeEqual } = require('node:crypto')
const mongoose = require('mongoose')
const BloodRequest = require('../models/BloodRequest')
const HttpError = require('../errors/http-error')
const { validateBloodRequest } = require('../utils/blood-request-validation')

function ensureDatabase() {
  if (mongoose.connection.readyState !== 1) {
    throw new HttpError(503, 'DATABASE_UNAVAILABLE', 'Blood requests are temporarily unavailable.')
  }
}

function serializeRequest(request) {
  const legacyStatuses = ['active', 'fulfilled', 'expired', 'cancelled']
  const status = ['pending', 'approved', 'rejected'].includes(request.status)
    ? request.status
    : 'pending'
  return {
    id: String(request._id || request.id),
    requesterName: request.requesterName,
    patientName: request.patientName,
    patientIssue: request.patientIssue,
    hospitalName: request.hospitalName,
    hospitalLocation: request.hospitalLocation,
    phone: request.phone,
    bloodGroup: request.bloodGroup,
    units: request.units,
    requiredAt: request.requiredAt,
    status,
    fulfillmentStatus: request.fulfillmentStatus
      || (legacyStatuses.includes(request.status) ? request.status : 'active'),
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  }
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

async function expirePastRequests(now = new Date()) {
  await BloodRequest.updateMany(
    { status: 'approved', fulfillmentStatus: 'active', requiredAt: { $lte: now } },
    { $set: { fulfillmentStatus: 'expired' } },
  )
}

async function createRequest(input) {
  ensureDatabase()
  const values = validateBloodRequest(input)
  const managementToken = randomBytes(32).toString('hex')
  const request = await BloodRequest.create({
    ...values,
    status: 'pending',
    fulfillmentStatus: 'active',
    managementTokenHash: hashToken(managementToken),
  })
  return { request: serializeRequest(request), managementToken }
}

async function listRequests({ page, limit, bloodGroup, hospitalLocation, status }) {
  ensureDatabase()
  await expirePastRequests()
  const criteria = {}

  criteria.status = 'approved'
  if (status && status !== 'all') criteria.fulfillmentStatus = status
  if (bloodGroup) criteria.bloodGroup = bloodGroup
  if (hospitalLocation) {
    const escapedLocation = hospitalLocation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    criteria.hospitalLocation = { $regex: escapedLocation, $options: 'i' }
  }

  const [requests, total] = await Promise.all([
    BloodRequest.find(criteria)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    BloodRequest.countDocuments(criteria),
  ])
  return {
    requests: requests.map(serializeRequest),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  }
}

async function updateRequestStatus(id, input) {
  ensureDatabase()
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(404, 'BLOOD_REQUEST_NOT_FOUND', 'The blood request could not be found.')
  }
  if (
    !input
    || typeof input !== 'object'
    || Array.isArray(input)
    || Object.keys(input).some((field) => !['status', 'managementToken'].includes(field))
    || !['fulfilled', 'cancelled'].includes(input.status)
    || typeof input.managementToken !== 'string'
    || !/^[a-f0-9]{64}$/i.test(input.managementToken)
  ) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Provide a valid status and management code.')
  }

  const request = await BloodRequest.findById(id).select('+managementTokenHash')
  if (!request) throw new HttpError(404, 'BLOOD_REQUEST_NOT_FOUND', 'The blood request could not be found.')
  const storedHash = Buffer.from(request.managementTokenHash, 'hex')
  const suppliedHash = Buffer.from(hashToken(input.managementToken), 'hex')
  if (storedHash.length !== suppliedHash.length || !timingSafeEqual(storedHash, suppliedHash)) {
    throw new HttpError(403, 'INVALID_MANAGEMENT_TOKEN', 'The management code is invalid.')
  }
  if (!['active', 'expired'].includes(request.fulfillmentStatus || request.status)) {
    throw new HttpError(409, 'BLOOD_REQUEST_ALREADY_CLOSED', 'This blood request has already been closed.')
  }
  if (request.status !== 'approved') {
    throw new HttpError(409, 'BLOOD_REQUEST_NOT_APPROVED', 'This blood request has not been approved.')
  }

  request.fulfillmentStatus = input.status
  await request.save()
  return serializeRequest(request)
}

async function listAdminRequests({ page, limit, approvalStatus }) {
  ensureDatabase()
  await expirePastRequests()
  const pendingCriteria = { status: { $in: ['pending', 'active', 'fulfilled', 'expired', 'cancelled'] } }
  const [pending, approved, rejected, requests, total] = await Promise.all([
    BloodRequest.countDocuments(pendingCriteria),
    BloodRequest.countDocuments({ status: 'approved' }),
    BloodRequest.countDocuments({ status: 'rejected' }),
    BloodRequest.find(approvalStatus === 'pending'
      ? pendingCriteria
      : { status: approvalStatus })
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    BloodRequest.countDocuments(approvalStatus === 'pending'
      ? pendingCriteria
      : { status: approvalStatus }),
  ])
  return {
    requests: requests.map(serializeRequest),
    counts: { pending, approved, rejected },
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  }
}

async function moderateRequest(id, status) {
  ensureDatabase()
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(404, 'BLOOD_REQUEST_NOT_FOUND', 'The blood request could not be found.')
  }
  if (!['approved', 'rejected'].includes(status)) {
    throw new HttpError(400, 'INVALID_BLOOD_REQUEST_STATUS', 'Select approved or rejected status.')
  }
  const legacyStatuses = ['active', 'fulfilled', 'expired', 'cancelled']
  const existingRequest = await BloodRequest.findById(id).select('status')
  if (!existingRequest) throw new HttpError(404, 'BLOOD_REQUEST_NOT_FOUND', 'The blood request could not be found.')
  if (!['pending', ...legacyStatuses].includes(existingRequest.status)) {
    throw new HttpError(409, 'BLOOD_REQUEST_ALREADY_REVIEWED', 'This blood request has already been reviewed.')
  }
  const previousStatus = existingRequest.status
  const request = await BloodRequest.findOneAndUpdate(
    { _id: id, status: { $in: ['pending', ...legacyStatuses] } },
    { $set: { status } },
    { returnDocument: 'after', runValidators: true },
  )
  if (!request) {
    const existing = await BloodRequest.exists({ _id: id })
    if (!existing) throw new HttpError(404, 'BLOOD_REQUEST_NOT_FOUND', 'The blood request could not be found.')
    throw new HttpError(409, 'BLOOD_REQUEST_ALREADY_REVIEWED', 'This blood request has already been reviewed.')
  }
  if (legacyStatuses.includes(previousStatus)) {
    request.fulfillmentStatus = previousStatus
  }
  if (status === 'approved' && request.requiredAt <= new Date() && request.fulfillmentStatus === 'active') {
    request.fulfillmentStatus = 'expired'
  }
  if (legacyStatuses.includes(previousStatus) || (status === 'approved' && request.requiredAt <= new Date())) {
    await request.save()
  }
  return serializeRequest(request)
}

async function updateAdminRequestStatus(id, status) {
  ensureDatabase()
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(404, 'BLOOD_REQUEST_NOT_FOUND', 'The blood request could not be found.')
  }
  if (status !== 'fulfilled') {
    throw new HttpError(400, 'INVALID_BLOOD_REQUEST_STATUS', 'Select a valid request status.')
  }
  const request = await BloodRequest.findOne({
    _id: id,
    status: 'approved',
    fulfillmentStatus: { $in: ['active', 'expired'] },
  })
  if (!request) {
    const existing = await BloodRequest.exists({ _id: id })
    if (!existing) throw new HttpError(404, 'BLOOD_REQUEST_NOT_FOUND', 'The blood request could not be found.')
    throw new HttpError(409, 'BLOOD_REQUEST_ALREADY_CLOSED', 'This blood request cannot be marked fulfilled.')
  }
  request.fulfillmentStatus = 'fulfilled'
  await request.save()
  return serializeRequest(request)
}

module.exports = {
  createRequest,
  listAdminRequests,
  listRequests,
  moderateRequest,
  updateAdminRequestStatus,
  updateRequestStatus,
}
