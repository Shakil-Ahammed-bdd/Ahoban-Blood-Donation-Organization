const { getDonorLeaderboard } = require('../services/leaderboard.service')

async function getTopDonors(req, res, next) {
  try {
    res.json({ status: 'ok', donors: await getDonorLeaderboard() })
  } catch (error) {
    next(error)
  }
}

module.exports = { getTopDonors }
