const express = require('express')
const { listDonors, readDonor } = require('../controllers/donor.controller')

const router = express.Router()

router.get('/', listDonors)
router.get('/:id', readDonor)

module.exports = router
