const { rateLimit } = require('express-rate-limit')
const express = require('express')
const { getCurrentUser, login, logout, register } = require('../controllers/auth.controller')
const { authenticate } = require('../middleware/authenticate')
const profilePhotoUpload = require('../middleware/profile-photo-upload')
const verifyOrigin = require('../middleware/verify-origin')

const router = express.Router()
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler(req, res) {
    res.status(429).json({
      status: 'error',
      code: 'RATE_LIMITED',
      message: 'Too many authentication attempts. Please try again later.',
    })
  },
})

router.post('/register', verifyOrigin, authLimiter, profilePhotoUpload.optional, register)
router.post('/login', verifyOrigin, authLimiter, login)
router.get('/me', authenticate, getCurrentUser)
router.post('/logout', verifyOrigin, logout)

module.exports = router
