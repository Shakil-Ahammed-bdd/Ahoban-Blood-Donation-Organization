const { getLiveImpact } = require('../services/stats.service')

async function getLiveImpactStats(req, res, next) {
  try {
    res.set('Cache-Control', 'public, max-age=5, stale-while-revalidate=10')
    res.json({ status: 'ok', ...await getLiveImpact() })
  } catch (error) {
    next(error)
  }
}

module.exports = { getLiveImpactStats }
