const HttpError = require('../errors/http-error')
const experienceService = require('../services/experience.service')

function parsePagination(query) {
  const page = Number(query.page ?? 1)
  const limit = Number(query.limit ?? 9)
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 24) {
    throw new HttpError(400, 'INVALID_PAGINATION', 'Page must be positive and limit must be from 1 to 24.')
  }
  return { page, limit }
}

async function listPublic(req, res, next) {
  try {
    const result = await experienceService.listPublicExperiences({
      ...parsePagination(req.query),
      currentUserId: req.user?._id,
    })
    res.json({ success: true, status: 'ok', data: result, ...result })
  } catch (error) {
    next(error)
  }
}

async function readPublic(req, res, next) {
  try {
    const experience = await experienceService.getPublicExperience(req.params.id, req.user?._id)
    res.json({ success: true, status: 'ok', data: { experience }, experience })
  } catch (error) {
    next(error)
  }
}

async function listMine(req, res, next) {
  try {
    const experiences = await experienceService.listMyExperiences(req.user._id)
    res.json({ success: true, status: 'ok', data: { experiences }, experiences })
  } catch (error) {
    next(error)
  }
}

async function create(req, res, next) {
  try {
    const experience = await experienceService.createExperience(req.user, req.body, req.files)
    res.status(201).json({
      success: true,
      status: 'ok',
      message: 'Experience submitted successfully and is now public.',
      data: { experience },
      experience,
    })
  } catch (error) {
    next(error)
  }
}

async function update(req, res, next) {
  try {
    const experience = await experienceService.updateExperience(
      req.params.id,
      req.user,
      req.body,
      req.files,
    )
    res.json({
      success: true,
      status: 'ok',
      message: 'Experience updated successfully and remains public.',
      data: { experience },
      experience,
    })
  } catch (error) {
    next(error)
  }
}

async function remove(req, res, next) {
  try {
    await experienceService.deleteExperience(req.params.id, req.user._id)
    res.status(204).end()
  } catch (error) {
    next(error)
  }
}

module.exports = {
  create,
  listMine,
  listPublic,
  readPublic,
  remove,
  update,
}
