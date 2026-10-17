const express = require('express')
const {
  addDonationDate,
  editProfile,
  editProfilePhoto,
  readProfile,
  readPublicExperiences,
  readPublicProfile,
  removeProfile,
} = require('../controllers/user.controller')
const { authenticate } = require('../middleware/authenticate')
const optionalAuthenticate = require('../middleware/optional-authenticate')
const profilePhotoUpload = require('../middleware/profile-photo-upload')
const verifyOrigin = require('../middleware/verify-origin')

const router = express.Router()

router.get('/:id/profile', readPublicProfile)
router.get('/:id/experiences', optionalAuthenticate, readPublicExperiences)
router.use(authenticate)
router.get('/profile', readProfile)
router.post('/profile/donation-history', verifyOrigin, addDonationDate)
router.put('/profile/photo', verifyOrigin, profilePhotoUpload, editProfilePhoto)
router.patch('/profile', verifyOrigin, editProfile)
router.delete('/profile', verifyOrigin, removeProfile)

module.exports = router
