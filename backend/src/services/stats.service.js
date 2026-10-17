const mongoose = require('mongoose')
const User = require('../models/User')
const HttpError = require('../errors/http-error')

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

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

  const [aggregates = { total: [], bloodGroups: [], monthlyRegistrations: [] }] =
    await User.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          bloodGroups: [
            { $match: { bloodGroup: { $in: BLOOD_GROUPS } } },
            { $group: { _id: '$bloodGroup', count: { $sum: 1 } } },
          ],
          monthlyRegistrations: [
            { $match: { createdAt: { $type: 'date' } } },
            {
              $group: {
                _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                count: { $sum: 1 },
              },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
          ],
        },
      },
    ])

  const bloodGroups = Object.fromEntries(BLOOD_GROUPS.map((group) => [group, 0]))
  for (const group of aggregates.bloodGroups) {
    bloodGroups[group._id] = group.count
  }

  const monthlyRegistrations = aggregates.monthlyRegistrations.map(({ _id, count }) => ({
    year: _id.year,
    month: _id.month,
    label: monthLabel(_id.year, _id.month),
    count,
  }))

  return {
    totalRegistered: aggregates.total[0]?.count || 0,
    bloodGroups,
    monthlyRegistrations,
  }
}

module.exports = { getLiveImpact }
