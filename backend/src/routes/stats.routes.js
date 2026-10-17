const express = require('express')
const { getLiveImpactStats } = require('../controllers/stats.controller')

const router = express.Router()

router.get('/live-impact', getLiveImpactStats)

module.exports = router
