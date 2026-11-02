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

const router = express.Router()

router.get('/', authenticate, requireRole('admin', 'super_admin'), listAdmins)
router.get('/overview', authenticate, requireRole('admin', 'super_admin'), getOverview)
router.get('/users', authenticate, requireRole('admin', 'super_admin'), listUsers)
router.post('/', authenticate, requireSuperAdmin, verifyOrigin, createAdmin)
router.patch('/:id', authenticate, requireSuperAdmin, verifyOrigin, updateAdmin)
router.delete('/:id', authenticate, requireSuperAdmin, verifyOrigin, deleteAdmin)

module.exports = router
