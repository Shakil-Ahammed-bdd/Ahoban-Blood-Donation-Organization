const { listNotificationsForUser, markAllNotificationsRead, markNotificationRead, triggerApprovalNotifications, getMatchCandidates } = require('../services/notification.service')
const BloodRequest = require('../models/BloodRequest')
const HttpError = require('../errors/http-error')

function parsePagination(query) {
  const page = Number(query.page ?? 1)
  const limit = Number(query.limit ?? 10)
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new HttpError(400, 'INVALID_PAGINATION', 'Page must be positive and limit must be from 1 to 50.')
  }
  return { page, limit }
}

async function listNotifications(req, res, next) {
  try {
    const { page, limit } = parsePagination(req.query)
    const result = await listNotificationsForUser(req.user._id, { page, limit })
    res.json({ success: true, status: 'ok', ...result })
  } catch (error) {
    next(error)
  }
}

async function markAsRead(req, res, next) {
  try {
    const result = await markNotificationRead(req.params.id, req.user._id)
    res.json({ success: true, status: 'ok', notification: result })
  } catch (error) {
    next(error)
  }
}

async function markAllRead(req, res, next) {
  try {
    const result = await markAllNotificationsRead(req.user._id)
    res.json({ success: true, status: 'ok', updated: result.updated })
  } catch (error) {
    next(error)
  }
}

async function previewMatches(req, res, next) {
  try {
    const request = await BloodRequest.findById(req.params.id)
    if (!request) throw new HttpError(404, 'BLOOD_REQUEST_NOT_FOUND', 'The blood request could not be found.')
    const matches = await getMatchCandidates(request)
    res.json({ success: true, status: 'ok', data: matches })
  } catch (error) {
    next(error)
  }
}

async function sendApprovalNotifications(req, res, next) {
  try {
    const request = await BloodRequest.findById(req.params.id)
    if (!request) throw new HttpError(404, 'BLOOD_REQUEST_NOT_FOUND', 'The blood request could not be found.')
    if (request.status !== 'approved') {
      throw new HttpError(400, 'INVALID_BLOOD_REQUEST_STATUS', 'Only approved requests can trigger notifications.')
    }
    const result = await triggerApprovalNotifications(request)
    res.json({ success: true, status: 'ok', ...result })
  } catch (error) {
    next(error)
  }
}

module.exports = { listNotifications, markAllRead, markAsRead, previewMatches, sendApprovalNotifications }
