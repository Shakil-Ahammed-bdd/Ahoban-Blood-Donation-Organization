const mongoose = require('mongoose')
const Experience = require('../models/Experience')
const HttpError = require('../errors/http-error')
const { removeImages, storeImages } = require('./experience-image-storage')
const { getExperienceSummaries, deleteExperienceInteractions } = require('./experience-social.service')
const { validateExperience } = require('../utils/experience-validation')

function ensureDatabase() {
  if (mongoose.connection.readyState !== 1) {
    throw new HttpError(503, 'DATABASE_UNAVAILABLE', 'Experience service is temporarily unavailable.')
  }
}

function serializeExperience(experience) {
  const images = experience.images?.length ? experience.images : [experience.photoUrl].filter(Boolean)
  const donor = experience.userId && typeof experience.userId === 'object'
    ? experience.userId
    : null
  return {
    id: String(experience._id || experience.id),
    donorId: String(donor?._id || experience.userId || ''),
    profilePhotoUrl: donor?.profilePhotoUrl || '',
    donorName: experience.donorName,
    publicUserId: experience.publicUserId,
    bloodGroup: experience.bloodGroup,
    division: experience.division,
    district: experience.district,
    location: experience.location,
    donationDate: experience.donationDate,
    message: experience.message,
    ...(experience.donationCount ? { donationCount: experience.donationCount } : {}),
    images,
    photoUrl: images[0] || '',
    isPublic: experience.isPublic ?? experience.publicConsent ?? false,
    status: experience.status,
    createdAt: experience.createdAt,
    updatedAt: experience.updatedAt,
  }
}

async function listPublicExperiences({ page = 1, limit = 9, userId, currentUserId } = {}) {
  ensureDatabase()
  if (userId && !mongoose.isValidObjectId(userId)) {
    throw new HttpError(404, 'DONOR_NOT_FOUND', 'This donor profile is not public.')
  }
  const criteria = { isPublic: true, status: 'approved', ...(userId ? { userId } : {}) }
  const skip = (page - 1) * limit
  const [experiences, total] = await Promise.all([
    Experience.find(criteria)
      .populate('userId', 'profilePhotoUrl')
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Experience.countDocuments(criteria),
  ])
  const serialized = await getExperienceSummaries(experiences.map(serializeExperience), currentUserId)
  return {
    experiences: serialized,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  }
}

async function listMyExperiences(userId) {
  ensureDatabase()
  const experiences = await Experience.find({ userId })
    .populate('userId', 'profilePhotoUrl')
    .sort({ createdAt: -1 })
    .lean()
  return getExperienceSummaries(experiences.map(serializeExperience), userId)
}

async function listExperiencesForModeration() {
  ensureDatabase()
  const experiences = await Experience.find({ isPublic: true, status: 'pending' })
    .populate('userId', 'profilePhotoUrl')
    .sort({ createdAt: 1, _id: 1 })
    .lean()
  return getExperienceSummaries(experiences.map(serializeExperience))
}

async function moderateExperience(id, status) {
  ensureDatabase()
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(404, 'EXPERIENCE_NOT_FOUND', 'The experience was not found.')
  }
  if (!['approved', 'rejected'].includes(status)) {
    throw new HttpError(400, 'INVALID_MODERATION_STATUS', 'Choose approved or rejected.')
  }

  const experience = await Experience.findOneAndUpdate(
    { _id: id, status: 'pending', isPublic: true },
    { $set: { status, ...(status === 'approved' ? { isPublic: true } : {}) } },
    { returnDocument: 'after', runValidators: true },
  ).populate('userId', 'profilePhotoUrl')
  if (!experience) {
    throw new HttpError(404, 'EXPERIENCE_NOT_FOUND', 'The pending public experience was not found.')
  }
  return serializeExperience(experience)
}

async function getPublicExperience(id, currentUserId) {
  ensureDatabase()
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(404, 'EXPERIENCE_NOT_FOUND', 'The experience was not found.')
  }
  const experience = await Experience.findOne({
    _id: id,
    isPublic: true,
    status: 'approved',
  }).populate('userId', 'profilePhotoUrl').lean()
  if (!experience) {
    throw new HttpError(404, 'EXPERIENCE_NOT_FOUND', 'The experience was not found.')
  }
  const [serialized] = await getExperienceSummaries([serializeExperience(experience)], currentUserId)
  return serialized
}

async function createExperience(user, body, file) {
  ensureDatabase()
  const files = Array.isArray(file) ? file : file ? [file] : []
  if (files.length < 1 || files.length > 5) {
    throw new HttpError(400, 'INVALID_PHOTO_COUNT', 'Upload between one and five photos.')
  }
  const values = validateExperience({ ...body, photos: files.length > 0 }, user)
  const images = await storeImages(files)
  try {
    const experience = await Experience.create({
      ...values,
      userId: user._id,
      images,
      photoUrl: images[0],
      isPublic: values.publicConsent,
      status: 'pending',
    })
    await experience.populate('userId', 'profilePhotoUrl')
    return serializeExperience(experience)
  } catch (error) {
    await removeImages(images)
    throw error
  }
}

async function updateExperience(id, user, body, files = []) {
  ensureDatabase()
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(404, 'EXPERIENCE_NOT_FOUND', 'The experience was not found.')
  }
  const experience = await Experience.findOne({ _id: id, userId: user._id })
  if (!experience) {
    throw new HttpError(404, 'EXPERIENCE_NOT_FOUND', 'The experience was not found.')
  }

  const uploadedFiles = Array.isArray(files) ? files : files ? [files] : []
  if (uploadedFiles.length > 5) {
    throw new HttpError(400, 'INVALID_PHOTO_COUNT', 'Upload no more than five photos.')
  }
  const oldImages = experience.images?.length ? experience.images : [experience.photoUrl].filter(Boolean)
  let retainedImages = oldImages
  if (Object.hasOwn(body, 'existingImages')) {
    try {
      retainedImages = JSON.parse(body.existingImages)
    } catch {
      throw new HttpError(400, 'INVALID_PHOTO_SELECTION', 'The selected existing photos are invalid.')
    }
    if (
      !Array.isArray(retainedImages) ||
      retainedImages.some((image) => typeof image !== 'string' || !oldImages.includes(image)) ||
      new Set(retainedImages).size !== retainedImages.length
    ) {
      throw new HttpError(400, 'INVALID_PHOTO_SELECTION', 'Only photos already attached to this experience can be retained.')
    }
  } else if (uploadedFiles.length) {
    retainedImages = []
  }
  if (retainedImages.length + uploadedFiles.length < 1 || retainedImages.length + uploadedFiles.length > 5) {
    throw new HttpError(400, 'INVALID_PHOTO_COUNT', 'An experience must have between one and five photos.')
  }

  const values = validateExperience({ ...body, photos: retainedImages.length + uploadedFiles.length > 0 }, user, { isUpdate: true })
  const uploadedImages = uploadedFiles.length ? await storeImages(uploadedFiles) : []
  const newImages = [...retainedImages, ...uploadedImages]
  Object.assign(experience, values, {
    images: newImages,
    photoUrl: newImages[0] || '',
    isPublic: values.publicConsent,
    status: 'pending',
  })
  try {
    await experience.save()
  } catch (error) {
    await removeImages(uploadedImages)
    throw error
  }
  await removeImages(oldImages.filter((image) => !retainedImages.includes(image)))
  await experience.populate('userId', 'profilePhotoUrl')
  return serializeExperience(experience)
}

async function deleteExperience(id, userId) {
  ensureDatabase()
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(404, 'EXPERIENCE_NOT_FOUND', 'The experience was not found.')
  }
  const experience = await Experience.findOneAndDelete({ _id: id, userId })
  if (!experience) {
    throw new HttpError(404, 'EXPERIENCE_NOT_FOUND', 'The experience was not found.')
  }
  await deleteExperienceInteractions(experience._id)
  await removeImages(experience.images?.length ? experience.images : [experience.photoUrl])
}

module.exports = {
  createExperience,
  deleteExperience,
  getPublicExperience,
  listExperiencesForModeration,
  listMyExperiences,
  listPublicExperiences,
  moderateExperience,
  updateExperience,
}
