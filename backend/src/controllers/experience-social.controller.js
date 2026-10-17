const HttpError = require('../errors/http-error')
const socialService = require('../services/experience-social.service')

function parsePagination(query) {
  const page = Number(query.page ?? 1)
  const limit = Number(query.limit ?? 10)
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 30) {
    throw new HttpError(400, 'INVALID_PAGINATION', 'Page must be positive and limit must be from 1 to 30.')
  }
  return { page, limit }
}

async function readReactions(req, res, next) {
  try {
    const reactions = await socialService.getReactions(req.params.id, req.user?._id)
    res.json({ success: true, status: 'ok', data: reactions, ...reactions })
  } catch (error) {
    next(error)
  }
}

async function toggleReaction(req, res, next) {
  try {
    const reactions = await socialService.toggleReaction(req.params.id, req.user._id, req.body?.type)
    res.json({ success: true, status: 'ok', data: reactions, ...reactions })
  } catch (error) {
    next(error)
  }
}

async function removeReaction(req, res, next) {
  try {
    const reactions = await socialService.removeReaction(req.params.id, req.user._id)
    res.json({ success: true, status: 'ok', data: reactions, ...reactions })
  } catch (error) {
    next(error)
  }
}

async function listComments(req, res, next) {
  try {
    const result = await socialService.listComments(req.params.id, parsePagination(req.query))
    res.json({ success: true, status: 'ok', data: result, ...result })
  } catch (error) {
    next(error)
  }
}

async function createComment(req, res, next) {
  try {
    const comment = await socialService.createComment(req.params.id, req.user._id, req.body?.content)
    res.status(201).json({ success: true, status: 'ok', data: { comment }, comment })
  } catch (error) {
    next(error)
  }
}

async function updateComment(req, res, next) {
  try {
    const comment = await socialService.updateComment(req.params.id, req.user._id, req.body?.content)
    res.json({ success: true, status: 'ok', data: { comment }, comment })
  } catch (error) {
    next(error)
  }
}

async function deleteComment(req, res, next) {
  try {
    await socialService.deleteComment(req.params.id, req.user._id)
    res.status(204).end()
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createComment,
  deleteComment,
  listComments,
  readReactions,
  removeReaction,
  toggleReaction,
  updateComment,
}
