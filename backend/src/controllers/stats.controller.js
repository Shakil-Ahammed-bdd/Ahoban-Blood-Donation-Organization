const { getLiveImpact } = require('../services/stats.service')

async function getLiveImpactStats(req, res, next) {
  try {
    res.json({ status: 'ok', ...await getLiveImpact() })
  } catch (error) {
    next(error)
  }
}

module.exports = { getLiveImpactStats }
