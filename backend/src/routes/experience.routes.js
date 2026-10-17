const express = require('express')
const { authenticate } = require('../middleware/authenticate')
const optionalAuthenticate = require('../middleware/optional-authenticate')
const experienceUpload = require('../middleware/experience-upload')
const verifyOrigin = require('../middleware/verify-origin')
const requireExperienceModerator = require('../middleware/require-experience-moderator')
const controller = require('../controllers/experience.controller')
const socialController = require('../controllers/experience-social.controller')

const router = express.Router()

router.get('/', optionalAuthenticate, controller.listPublic)
router.get('/moderation/queue', authenticate, requireExperienceModerator, controller.listModerationQueue)
router.patch(
  '/:id/moderation',
  authenticate,
  requireExperienceModerator,
  verifyOrigin,
  controller.moderate,
)
router.get('/mine', authenticate, controller.listMine)
router.post('/', authenticate, verifyOrigin, experienceUpload, controller.create)
router.get('/:id/reactions', optionalAuthenticate, socialController.readReactions)
router.post('/:id/reactions', authenticate, verifyOrigin, socialController.toggleReaction)
router.delete('/:id/reactions', authenticate, verifyOrigin, socialController.removeReaction)
router.get('/:id/comments', optionalAuthenticate, socialController.listComments)
router.post('/:id/comments', authenticate, verifyOrigin, socialController.createComment)
router.get('/:id', optionalAuthenticate, controller.readPublic)
router.patch('/:id', authenticate, verifyOrigin, experienceUpload, controller.update)
router.delete('/:id', authenticate, verifyOrigin, controller.remove)

module.exports = router
