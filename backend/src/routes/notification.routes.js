const express = require('express')
const controller = require('../controllers/notification.controller')
const { authenticate, requireRole } = require('../middleware/authenticate')
const verifyOrigin = require('../middleware/verify-origin')

const router = express.Router()

router.get('/', authenticate, controller.listNotifications)
router.patch('/read-all', authenticate, controller.markAllRead)
router.patch('/:id/read', authenticate, controller.markAsRead)
router.get('/preview/:id', authenticate, requireRole('admin', 'super_admin'), verifyOrigin, controller.previewMatches)
router.post('/send/:id', authenticate, requireRole('admin', 'super_admin'), verifyOrigin, controller.sendApprovalNotifications)

module.exports = router
