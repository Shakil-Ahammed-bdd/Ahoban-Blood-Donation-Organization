const User = require('../models/User')
const { calculateDonorBadge } = require('../utils/donor-badge')

async function getDonorBadge(userId, previousBloodDonations = 0) {
  const user = await User.findById(userId).select('donationHistory').lean()
  return calculateDonorBadge(
    previousBloodDonations,
    user?.donationHistory || [],
  )
}

function badgeSummary(badge) {
  const summary = { ...badge }
  delete summary.donationHistory
  delete summary.previousBloodDonations
  delete summary.loggedDonationCount
  return summary
}

async function getDonorBadges(users) {
  if (!users.length) return new Map()
  return new Map(users.map((user) => [
    String(user._id),
    badgeSummary(
      calculateDonorBadge(user.previousBloodDonations, user.donationHistory || []),
    ),
  ]))
}

module.exports = { badgeSummary, getDonorBadge, getDonorBadges }
