const { getHealthStatus } = require('../services/health.service')

function getHealth(req, res) {
  const health = getHealthStatus()
  res.status(health.httpStatus).json(health.body)
}

module.exports = { getHealth }
