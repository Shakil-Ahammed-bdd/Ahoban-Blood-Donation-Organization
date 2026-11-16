const mongoose = require('mongoose')
const User = require('../models/User')
const Experience = require('../models/Experience')
const ExperienceComment = require('../models/ExperienceComment')
const HttpError = require('../errors/http-error')
const { toPublicUser } = require('./auth.service')
const { removeAvatar, storeAvatar } = require('./experience-image-storage')
const { deleteUserInteractions } = require('./experience-social.service')
const { isAvailableToDonate } = require('../utils/donation-eligibility')
const { badgeSummary } = require('./donor-badge.service')
const { calculateDonorBadge } = require('../utils/donor-badge')
const { approvedExperienceCriteria } = require('../utils/experience-status')
const { invalidateLiveImpactCache } = require('./stats.service')

function ensureDatabase() {
  if (mongoose.connection.readyState !== 1) {
    throw new HttpError(503, 'DATABASE_UNAVAILABLE', 'Profile service is temporarily unavailable.')
  }
}

async function toProfileUser(user) {
  const donorBadge = calculateDonorBadge(
    user.previousBloodDonations,
    user.donationHistory || [],
  )
  return { ...toPublicUser(user), donorBadge }
}

async function getProfile(userId) {
  ensureDatabase()
  const user = await User.findById(userId)
  if (!user) throw new HttpError(404, 'PROFILE_NOT_FOUND', 'The user profile was not found.')
  return toProfileUser(user)
}

async function getPublicProfile(identifier) {
  ensureDatabase()
  const query = mongoose.isValidObjectId(identifier)
    ? { _id: identifier }
    : { userId: String(identifier).toUpperCase() }
  const user = await User.findOne(query)
    .select('userId fullName phone whatsappNumber isContactPublic bloodGroup division district upazila location lastDonationDate previousBloodDonations donationHistory isSearchable profilePhotoUrl createdAt')
    .lean()
  if (!user) throw new HttpError(404, 'PROFILE_NOT_FOUND', 'The public donor profile was not found.')

  if (!user.isSearchable) {
    const [hasPublicPost, commentPostIds] = await Promise.all([
      Experience.exists(approvedExperienceCriteria({ userId: user._id })),
      ExperienceComment.distinct('experienceId', { userId: user._id }),
    ])
    const hasPublicComment = commentPostIds.length > 0 && await Experience.exists({
      _id: { $in: commentPostIds },
      ...approvedExperienceCriteria(),
    })
    if (!hasPublicPost && !hasPublicComment) {
      throw new HttpError(404, 'PROFILE_NOT_FOUND', 'The public donor profile was not found.')
    }
  }
  const donorBadge = badgeSummary(calculateDonorBadge(
    user.previousBloodDonations,
    user.donationHistory || [],
  ))
  return {
    id: String(user._id),
    userId: user.userId,
    fullName: user.fullName,
    profilePhotoUrl: user.profilePhotoUrl || '',
    ...(user.isSearchable
      ? {
          bloodGroup: user.bloodGroup,
          division: user.division,
          district: user.district,
          upazila: user.upazila || '',
          location: user.location,
          ...(user.isContactPublic
            ? {
                phone: user.phone,
                ...(user.whatsappNumber ? { whatsappNumber: user.whatsappNumber } : {}),
              }
            : {}),
          lastDonationDate: user.lastDonationDate || null,
          previousBloodDonations: user.previousBloodDonations || 0,
          isAvailableToDonate: isAvailableToDonate(user.lastDonationDate),
          donorBadge,
          createdAt: user.createdAt,
        }
      : { limitedPublicProfile: true }),
  }
}

async function updateProfile(userId, changes) {
  ensureDatabase()
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: changes },
    { returnDocument: 'after', runValidators: true, context: 'query' },
  )
  if (!user) throw new HttpError(404, 'PROFILE_NOT_FOUND', 'The user profile was not found.')
  invalidateLiveImpactCache()
  return toProfileUser(user)
}

async function logDonationDate(userId, donationDate) {
  ensureDatabase()
  const currentUser = await User.findById(userId).select('createdAt')
  if (!currentUser) throw new HttpError(404, 'PROFILE_NOT_FOUND', 'The user profile was not found.')
  const joinedDate = new Date(currentUser.createdAt)
  joinedDate.setUTCHours(0, 0, 0, 0)
  if (donationDate < joinedDate) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Please check the highlighted fields.', {
      donationDate: 'Only donation dates from your registration date onward can be logged here.',
    })
  }
  const user = await User.findOneAndUpdate(
    {
      _id: userId,
      donationHistory: { $not: { $elemMatch: { donationDate } } },
    },
    {
      $push: { donationHistory: { donationDate, loggedAt: new Date() } },
      $max: { lastDonationDate: donationDate },
    },
    { returnDocument: 'after', runValidators: true },
  )
  if (user) return toProfileUser(user)

  const existingUser = await User.findById(userId).select('_id')
  if (!existingUser) throw new HttpError(404, 'PROFILE_NOT_FOUND', 'The user profile was not found.')
  const refreshedUser = await User.findByIdAndUpdate(
    userId,
    { $max: { lastDonationDate: donationDate } },
    { returnDocument: 'after', runValidators: true },
  )
  if (!refreshedUser) throw new HttpError(404, 'PROFILE_NOT_FOUND', 'The user profile was not found.')
  return toProfileUser(refreshedUser)
}

async function deleteDonationDate(userId, donationRecordId) {
  ensureDatabase()
  if (!mongoose.isValidObjectId(donationRecordId)) {
    throw new HttpError(400, 'INVALID_DONATION_RECORD', 'বৈধ রক্তদানের রেকর্ড নির্বাচন করুন।')
  }

  const recordId = new mongoose.Types.ObjectId(donationRecordId)
  const user = await User.findOneAndUpdate(
    {
      _id: userId,
      'donationHistory._id': recordId,
    },
    [
      {
        $set: {
          _deletedDonation: {
            $arrayElemAt: [
              {
                $filter: {
                  input: { $ifNull: ['$donationHistory', []] },
                  as: 'record',
                  cond: { $eq: ['$$record._id', recordId] },
                },
              },
              0,
            ],
          },
        },
      },
      {
        $set: {
          donationHistory: {
            $filter: {
              input: { $ifNull: ['$donationHistory', []] },
              as: 'record',
              cond: { $ne: ['$$record._id', recordId] },
            },
          },
        },
      },
      {
        $set: {
          lastDonationDate: {
            $cond: [
              {
                $eq: [
                  {
                    $dateToString: {
                      date: '$lastDonationDate',
                      format: '%Y-%m-%d',
                      timezone: 'UTC',
                    },
                  },
                  {
                    $dateToString: {
                      date: '$_deletedDonation.donationDate',
                      format: '%Y-%m-%d',
                      timezone: 'UTC',
                    },
                  },
                ],
              },
              {
                $ifNull: [
                  { $max: '$donationHistory.donationDate' },
                  null,
                ],
              },
              '$lastDonationDate',
            ],
          },
        },
      },
      { $unset: '_deletedDonation' },
    ],
    { returnDocument: 'after', updatePipeline: true },
  )

  if (!user) {
    throw new HttpError(404, 'DONATION_RECORD_NOT_FOUND', 'রক্তদানের রেকর্ডটি পাওয়া যায়নি।')
  }
  return toProfileUser(user)
}

async function updateProfilePhoto(userId, file) {
  ensureDatabase()
  const currentUser = await User.findById(userId).select('profilePhotoUrl')
  if (!currentUser) throw new HttpError(404, 'PROFILE_NOT_FOUND', 'The user profile was not found.')
  const previousImage = currentUser.profilePhotoUrl
  const imageUrl = await storeAvatar(file)
  let user
  try {
    user = await User.findByIdAndUpdate(
      userId,
      { $set: { profilePhotoUrl: imageUrl } },
      { returnDocument: 'after', runValidators: true },
    )
    if (!user) throw new HttpError(404, 'PROFILE_NOT_FOUND', 'The user profile was not found.')
  } catch (error) {
    await removeAvatar(imageUrl)
    throw error
  }
  try {
    await removeAvatar(previousImage)
  } catch (error) {
    console.error('Previous profile photo cleanup failed after the new photo was saved.', error)
  }
  return toProfileUser(user)
}

async function deleteProfile(userId) {
  ensureDatabase()
  const user = await User.findById(userId)
  if (!user) throw new HttpError(404, 'PROFILE_NOT_FOUND', 'The user profile was not found.')
  if (user.role === 'super_admin') {
    throw new HttpError(403, 'SUPER_ADMIN_PROTECTED', 'The Super Admin account cannot be deleted here.')
  }
  await deleteUserInteractions(userId)
  await User.deleteOne({ _id: userId })
  invalidateLiveImpactCache()
  await removeAvatar(user.profilePhotoUrl)
}

module.exports = {
  deleteProfile,
  deleteDonationDate,
  getProfile,
  getPublicProfile,
  logDonationDate,
  updateProfile,
  updateProfilePhoto,
}
