const { rateLimit } = require('express-rate-limit')
const express = require('express')
const controller = require('../controllers/blood-request.controller')
const verifyOrigin = require('../middleware/verify-origin')

const router = express.Router()
const submissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 6,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler(req, res) {
    res.status(429).json({
      status: 'error',
      code: 'RATE_LIMITED',
      message: 'Too many blood request submissions. Please try again later.',
    })
  },
})
const statusLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

router.get('/', controller.listPublic)
router.post('/', verifyOrigin, submissionLimiter, controller.create)
router.patch('/:id/status', verifyOrigin, statusLimiter, controller.updateStatus)

module.exports = router
