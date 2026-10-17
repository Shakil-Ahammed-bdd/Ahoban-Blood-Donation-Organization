const express = require('express')
const { authenticate } = require('../middleware/authenticate')
const verifyOrigin = require('../middleware/verify-origin')
const controller = require('../controllers/experience-social.controller')

const router = express.Router()

router.patch('/:id', authenticate, verifyOrigin, controller.updateComment)
router.delete('/:id', authenticate, verifyOrigin, controller.deleteComment)

module.exports = router
