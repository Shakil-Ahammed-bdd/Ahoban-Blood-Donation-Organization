const mongoose = require('mongoose')
const User = require('../models/User')
const HttpError = require('../errors/http-error')
const { getPublicProfile } = require('./user.service')
const { donationEligibilityCutoff, isAvailableToDonate } = require('../utils/donation-eligibility')
const upazilas = require('../../../shared/bangladesh-upazilas.json')
const { getDonorBadges } = require('./donor-badge.service')

const BLOOD_GROUPS = new Set(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
const DIVISIONS = require('../utils/bangladesh-locations')
const MAX_PAGE_SIZE = 50
const MAX_PAGE = 10000
const ALLOWED_FILTERS = new Set([
  'bloodGroup',
  'division',
  'district',
  'upazila',
  'location',
  'availability',
  'sort',
  'page',
  'limit',
])

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function publicDonor(user) {
  return {
    id: user.id,
    userId: user.userId,
    fullName: user.fullName,
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
    donorBadge: user.donorBadge,
    profilePhotoUrl: user.profilePhotoUrl || '',
    ...(user.createdAt ? { createdAt: user.createdAt } : {}),
  }
}

function parseFilters(query) {
  const fieldErrors = {}
  const filters = {}
  for (const key of Object.keys(query)) {
    if (!ALLOWED_FILTERS.has(key)) fieldErrors[key] = 'Unsupported search filter.'
  }
  if (query.bloodGroup) {
    if (!BLOOD_GROUPS.has(query.bloodGroup)) fieldErrors.bloodGroup = 'Select a valid blood group.'
    else filters.bloodGroup = query.bloodGroup
  }
  if (query.division) {
    if (!Object.hasOwn(DIVISIONS, query.division)) fieldErrors.division = 'Select a valid division.'
    else filters.division = query.division
  }
  if (query.district) {
    const division = query.division
    if (!division || !DIVISIONS[division]?.includes(query.district)) {
      fieldErrors.district = 'Select a district within the chosen division.'
    } else {
      filters.district = query.district
    }
  }
  if (query.upazila) {
    if (
      typeof query.upazila !== 'string' ||
      !query.district ||
      !(upazilas[query.district] || []).includes(query.upazila)
    ) {
      fieldErrors.upazila = 'Select an upazila within the chosen district.'
    } else {
      filters.upazila = query.upazila
    }
  }
  if (query.location) {
    if (typeof query.location !== 'string' || query.location.trim().length > 80) {
      fieldErrors.location = 'Location search must be 80 characters or fewer.'
    } else if (query.location.trim()) {
      filters.location = new RegExp(escapeRegex(query.location.trim()), 'i')
    }
  }
  if (query.availability) {
    if (
      typeof query.availability !== 'string' ||
      !['available', 'unavailable', 'all'].includes(query.availability)
    ) {
      fieldErrors.availability = 'Choose available, unavailable, or all donors.'
    } else if (query.availability === 'available') {
      const cutoff = donationEligibilityCutoff()
      filters.$or = [
        { lastDonationDate: { $exists: false } },
        { lastDonationDate: null },
        { lastDonationDate: { $lte: cutoff } },
      ]
    } else if (query.availability === 'unavailable') {
      const cutoff = donationEligibilityCutoff()
      filters.lastDonationDate = { $gt: cutoff, $lte: new Date() }
    }
  }
  if (query.sort !== undefined && query.sort !== 'recent') {
    fieldErrors.sort = 'Choose the recent sort order.'
  }
  const pageValue = query.page === undefined ? '1' : query.page
  const limitValue = query.limit === undefined ? '12' : query.limit
  const page = typeof pageValue === 'string' && /^\d+$/.test(pageValue) ? Number(pageValue) : NaN
  const limit = typeof limitValue === 'string' && /^\d+$/.test(limitValue) ? Number(limitValue) : NaN
  if (!Number.isInteger(page) || page < 1 || page > MAX_PAGE) {
    fieldErrors.page = `Page must be between 1 and ${MAX_PAGE}.`
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    fieldErrors.limit = `Limit must be between 1 and ${MAX_PAGE_SIZE}.`
  }
  if (Object.keys(fieldErrors).length) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Please check the donor search filters.', fieldErrors)
  }
  return { filters, page, limit }
}

async function searchDonors(query) {
  if (mongoose.connection.readyState !== 1) {
    throw new HttpError(503, 'DATABASE_UNAVAILABLE', 'Donor search is temporarily unavailable.')
  }
  const { filters, page, limit } = parseFilters(query)
  const criteria = { isSearchable: true, ...filters }
  const sort = query.sort === 'recent' ? { createdAt: -1, _id: -1 } : { fullName: 1, _id: 1 }
  const [users, total] = await Promise.all([
    User.find(criteria)
      .select('userId fullName phone whatsappNumber isContactPublic bloodGroup division district upazila location lastDonationDate previousBloodDonations donationHistory profilePhotoUrl createdAt')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(criteria),
  ])
  const badges = await getDonorBadges(users)
  return {
    donors: users.map((user) => publicDonor({
      ...user,
      id: String(user._id),
      donorBadge: badges.get(String(user._id)),
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  }
}

async function getDonor(identifier) {
  if (mongoose.connection.readyState !== 1) {
    throw new HttpError(503, 'DATABASE_UNAVAILABLE', 'Donor profiles are temporarily unavailable.')
  }
  try {
    return await getPublicProfile(identifier)
  } catch (error) {
    if (error.code === 'PROFILE_NOT_FOUND') {
      throw new HttpError(404, 'DONOR_NOT_FOUND', 'This donor profile is not public.')
    }
    throw error
  }
}

module.exports = { getDonor, searchDonors }
