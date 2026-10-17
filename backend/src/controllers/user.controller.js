const { clearSession } = require('../middleware/authenticate')
const HttpError = require('../errors/http-error')
const {
  deleteProfile,
  getProfile,
  getPublicProfile,
  logDonationDate,
  updateProfile,
  updateProfilePhoto,
} = require('../services/user.service')
const experienceService = require('../services/experience.service')
const { validateDonationDate, validateProfileUpdate } = require('../utils/auth-validation')

async function readProfile(req, res, next) {
  try {
    const user = await getProfile(req.user.id)
    res.json({ status: 'ok', user })
  } catch (error) {
    next(error)
  }
}

async function readPublicProfile(req, res, next) {
  try {
    const user = await getPublicProfile(req.params.id)
    res.json({ success: true, status: 'ok', user })
  } catch (error) {
    next(error)
  }
}

async function readPublicExperiences(req, res, next) {
  try {
    const page = Number(req.query.page ?? 1)
    const limit = Number(req.query.limit ?? 9)
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 24) {
      throw new HttpError(400, 'INVALID_PAGINATION', 'Page must be positive and limit must be from 1 to 24.')
    }
    const result = await experienceService.listPublicExperiences({
      page,
      limit,
      userId: req.params.id,
      currentUserId: req.user?._id,
    })
    res.json({ success: true, status: 'ok', data: result, ...result })
  } catch (error) {
    next(error)
  }
}

async function editProfile(req, res, next) {
  try {
    const changes = validateProfileUpdate(req.body, req.user)
    const user = await updateProfile(req.user.id, changes)
    res.json({ status: 'ok', message: 'Profile updated.', user })
  } catch (error) {
    next(error)
  }
}

async function addDonationDate(req, res, next) {
  try {
    const donationDate = validateDonationDate(req.body)
    const user = await logDonationDate(req.user.id, donationDate)
    res.json({ status: 'ok', message: 'Donation date recorded.', user })
  } catch (error) {
    next(error)
  }
}

async function editProfilePhoto(req, res, next) {
  try {
    const user = await updateProfilePhoto(req.user.id, req.file)
    res.json({ success: true, status: 'ok', message: 'Profile photo updated.', user })
  } catch (error) {
    next(error)
  }
}

async function removeProfile(req, res, next) {
  try {
    await deleteProfile(req.user.id)
    clearSession(res)
    res.status(204).end()
  } catch (error) {
    next(error)
  }
}

module.exports = {
  addDonationDate,
  editProfile,
  editProfilePhoto,
  readProfile,
  readPublicExperiences,
  readPublicProfile,
  removeProfile,
}
