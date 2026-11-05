const express = require('express')
const { authenticate, requireRole } = require('../middleware/authenticate')
const blogCoverUpload = require('../middleware/blog-cover-upload')
const verifyOrigin = require('../middleware/verify-origin')
const controller = require('../controllers/blog.controller')

const router = express.Router()

router.use(authenticate, requireRole('admin', 'super_admin'))
router.get('/categories', controller.listAdminCategories)
router.post('/categories', verifyOrigin, controller.createCategory)
router.patch('/categories/:id', verifyOrigin, controller.updateCategory)
router.delete('/categories/:id', verifyOrigin, controller.removeCategory)
router.get('/', controller.listAdmin)
router.post('/', verifyOrigin, blogCoverUpload, controller.create)
router.patch('/:id', verifyOrigin, blogCoverUpload, controller.update)
router.delete('/:id', verifyOrigin, controller.remove)

module.exports = router
