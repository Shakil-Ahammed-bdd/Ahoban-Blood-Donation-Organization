const express = require('express')
const { getTopDonors } = require('../controllers/leaderboard.controller')

const router = express.Router()

router.get('/donors', getTopDonors)

module.exports = router
