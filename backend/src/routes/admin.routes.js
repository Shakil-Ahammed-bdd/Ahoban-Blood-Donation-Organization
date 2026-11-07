const express = require('express')
const { authenticate, requireRole, requireSuperAdmin } = require('../middleware/authenticate')
const {
  createAdmin,
  deleteAdmin,
  getOverview,
  listAdmins,
  listUsers,
  updateAdmin,
} = require('../controllers/admin.controller')
const verifyOrigin = require('../middleware/verify-origin')
const experienceController = require('../controllers/experience.controller')
const bloodRequestController = require('../controllers/blood-request.controller')
const notificationController = require('../controllers/notification.controller')

const router = express.Router()

router.get('/', authenticate, requireRole('admin', 'super_admin'), listAdmins)
router.get('/overview', authenticate, requireRole('admin', 'super_admin'), getOverview)
router.get('/users', authenticate, requireRole('admin', 'super_admin'), listUsers)
router.get(
  '/experiences/pending',
  authenticate,
  requireRole('admin', 'super_admin'),
  experienceController.listPending,
)
router.patch(
  '/experiences/:id/approve',
  authenticate,
  requireRole('admin', 'super_admin'),
  verifyOrigin,
  experienceController.approvePending,
)
router.patch(
  '/experiences/:id/reject',
  authenticate,
  requireRole('admin', 'super_admin'),
  verifyOrigin,
  experienceController.rejectPending,
)
router.get(
  '/blood-requests',
  authenticate,
  requireRole('admin', 'super_admin'),
  bloodRequestController.listAdmin,
)
router.get(
  '/blood-requests/:id/matches',
  authenticate,
  requireRole('admin', 'super_admin'),
  verifyOrigin,
  notificationController.previewMatches,
)
router.patch(
  '/blood-requests/:id/moderate',
  authenticate,
  requireRole('admin', 'super_admin'),
  verifyOrigin,
  bloodRequestController.moderate,
)
router.patch(
  '/blood-requests/:id/status',
  authenticate,
  requireRole('admin', 'super_admin'),
  verifyOrigin,
  bloodRequestController.updateAdminStatus,
)
router.post('/', authenticate, requireSuperAdmin, verifyOrigin, createAdmin)
router.patch('/:id', authenticate, requireSuperAdmin, verifyOrigin, updateAdmin)
router.delete('/:id', authenticate, requireSuperAdmin, verifyOrigin, deleteAdmin)

module.exports = router
