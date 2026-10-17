const mongoose = require('mongoose')
const User = require('../models/User')
const HttpError = require('../errors/http-error')
const { isAvailableToDonate } = require('../utils/donation-eligibility')
const { badgeSummary } = require('./donor-badge.service')
const { calculateDonorBadge } = require('../utils/donor-badge')

const LEADERBOARD_LIMIT = 10

async function getDonorLeaderboard() {
  if (mongoose.connection.readyState !== 1) {
    throw new HttpError(503, 'DATABASE_UNAVAILABLE', 'The donor leaderboard is temporarily unavailable.')
  }

  const users = await User.aggregate([
    { $match: { isSearchable: true } },
    {
      $set: {
        _previousBloodDonations: {
          $max: [
            0,
            { $convert: { input: '$previousBloodDonations', to: 'int', onError: 0, onNull: 0 } },
          ],
        },
        _validDonationDates: {
          $filter: {
            input: {
              $map: {
                input: { $ifNull: ['$donationHistory', []] },
                as: 'record',
                in: {
                  $convert: {
                    input: '$$record.donationDate',
                    to: 'date',
                    onError: null,
                    onNull: null,
                  },
                },
              },
            },
            as: 'donationDate',
            cond: { $ne: ['$$donationDate', null] },
          },
        },
      },
    },
    {
      $set: {
        _uniqueDonationDates: {
          $setUnion: [
            {
              $map: {
                input: '$_validDonationDates',
                as: 'donationDate',
                in: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$$donationDate',
                    timezone: 'UTC',
                  },
                },
              },
            },
            [],
          ],
        },
      },
    },
    {
      $set: {
        _loggedDonationCount: { $size: '$_uniqueDonationDates' },
        _totalLifetimeDonations: {
          $add: ['$_previousBloodDonations', { $size: '$_uniqueDonationDates' }],
        },
      },
    },
    { $match: { _totalLifetimeDonations: { $gte: 1 } } },
    { $sort: { _totalLifetimeDonations: -1, createdAt: -1, _id: 1 } },
    { $limit: LEADERBOARD_LIMIT },
    {
      $project: {
        userId: 1,
        fullName: 1,
        profilePhotoUrl: 1,
        bloodGroup: 1,
        division: 1,
        district: 1,
        upazila: 1,
        location: 1,
        lastDonationDate: 1,
        createdAt: 1,
        previousBloodDonations: '$_previousBloodDonations',
        loggedDonationCount: '$_loggedDonationCount',
        totalLifetimeDonations: '$_totalLifetimeDonations',
        uniqueDonationDates: '$_uniqueDonationDates',
      },
    },
  ])

  return users.map((user, index) => {
    const donorBadge = badgeSummary(calculateDonorBadge(
      user.previousBloodDonations,
      user.uniqueDonationDates.map((date) => ({ donationDate: date })),
    ))

    return {
      rank: index + 1,
      id: String(user._id),
      userId: user.userId,
      fullName: user.fullName,
      profilePhotoUrl: user.profilePhotoUrl || '',
      bloodGroup: user.bloodGroup,
      division: user.division,
      district: user.district,
      upazila: user.upazila || '',
      location: user.location,
      previousBloodDonations: user.previousBloodDonations,
      loggedDonationCount: user.loggedDonationCount,
      totalLifetimeDonations: donorBadge.totalDonations,
      donorBadge,
      isAvailableToDonate: isAvailableToDonate(user.lastDonationDate),
    }
  })
}

module.exports = { getDonorLeaderboard }
