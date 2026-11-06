const mongoose = require('mongoose')
const User = require('../models/User')
const HttpError = require('../errors/http-error')

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const CACHE_DURATION_MS = 30_000
let cachedImpact = null
let cacheExpiresAt = 0
let pendingImpact = null
let cacheVersion = 0

function ensureDatabase() {
  if (mongoose.connection.readyState !== 1) {
    throw new HttpError(503, 'DATABASE_UNAVAILABLE', 'Live impact statistics are temporarily unavailable.')
  }
}

function monthLabel(year, month) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

async function getLiveImpact() {
  ensureDatabase()

  if (cachedImpact && cacheExpiresAt > Date.now()) return cachedImpact
  if (pendingImpact) return pendingImpact

  const version = cacheVersion
  const request = Promise.all([
    User.estimatedDocumentCount(),
    User.aggregate([
      { $match: { bloodGroup: { $in: BLOOD_GROUPS } } },
      { $group: { _id: '$bloodGroup', count: { $sum: 1 } } },
    ]),
    User.aggregate([
      { $match: { createdAt: { $type: 'date' } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
  ]).then(([totalRegistered, bloodGroupCounts, registrations]) => {
    const bloodGroups = Object.fromEntries(BLOOD_GROUPS.map((group) => [group, 0]))
    for (const group of bloodGroupCounts) bloodGroups[group._id] = group.count

    const result = {
      totalRegistered,
      bloodGroups,
      monthlyRegistrations: registrations.map(({ _id, count }) => ({
        year: _id.year,
        month: _id.month,
        label: monthLabel(_id.year, _id.month),
        count,
      })),
    }

    if (version === cacheVersion) {
      cachedImpact = result
      cacheExpiresAt = Date.now() + CACHE_DURATION_MS
    }
    return result
  })

  pendingImpact = request
  const clearPending = () => {
    if (pendingImpact === request) pendingImpact = null
  }
  request.then(clearPending, clearPending)
  return request
}

function invalidateLiveImpactCache() {
  cacheVersion += 1
  cachedImpact = null
  cacheExpiresAt = 0
  pendingImpact = null
}

module.exports = { getLiveImpact, invalidateLiveImpactCache }
