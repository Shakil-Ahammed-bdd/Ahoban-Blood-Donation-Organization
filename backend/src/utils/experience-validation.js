const HttpError = require('../errors/http-error')
const locations = require('./bangladesh-locations')

const BLOOD_GROUPS = new Set(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])

function invalid(fieldErrors) {
  throw new HttpError(
    400,
    'VALIDATION_ERROR',
    'Validation failed.',
    fieldErrors,
  )
}

function validateExperience(body, user, { isUpdate = false } = {}) {
  const fieldErrors = {}
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  const donationDateValue = typeof body?.donationDate === 'string' ? body.donationDate : ''
  const datePattern = /^\d{4}-\d{2}-\d{2}$/
  const donationDate = datePattern.test(donationDateValue || '')
    ? new Date(`${donationDateValue}T00:00:00.000Z`)
    : null

  if (message.length < 20 || message.length > 1000) {
    fieldErrors.message = 'Please write your experience in 20 to 1000 characters.'
  }
  if (
    !donationDate ||
    Number.isNaN(donationDate.getTime()) ||
    donationDate.toISOString().slice(0, 10) !== donationDateValue
  ) {
    fieldErrors.donationDate = 'Please provide a valid donation date.'
  } else if (donationDate > new Date()) {
    fieldErrors.donationDate = 'Donation date cannot be in the future.'
  }
  if (body?.publicConsent !== 'true' && body?.publicConsent !== true) {
    fieldErrors.publicConsent = 'Please agree to share your experience publicly.'
  }

  const countValue = body?.donationCount
  let donationCount
  if (countValue !== undefined && countValue !== '') {
    donationCount = Number(countValue)
    if (!Number.isInteger(donationCount) || donationCount < 1 || donationCount > 1000) {
      fieldErrors.donationCount = 'Donation count must be a whole number from 1 to 1000.'
    }
  }

  if (!user?.fullName || !user?.userId || !BLOOD_GROUPS.has(user?.bloodGroup)) {
    fieldErrors.profile = 'Complete your donor profile before sharing an experience.'
  }
  if (!Object.hasOwn(locations, user?.division) || !locations[user.division]?.includes(user?.district)) {
    fieldErrors.profile = 'Please update your division and district in your donor profile before sharing.'
  }

  if (Object.keys(fieldErrors).length) invalid(fieldErrors)
  if (!isUpdate && !body?.photos) {
    invalid({ photos: 'Please upload one to five JPG, PNG, or WebP photos (maximum 5 MB each).' })
  }

  return {
    donorName: user.fullName,
    publicUserId: user.userId,
    bloodGroup: user.bloodGroup,
    division: user.division,
    district: user.district,
    location: typeof user.location === 'string' ? user.location.trim() : '',
    donationDate,
    message,
    ...(donationCount === undefined ? {} : { donationCount }),
    publicConsent: true,
  }
}

module.exports = { validateExperience }
