const express = require('express')
const controller = require('../controllers/blog.controller')

const router = express.Router()

router.get('/categories', controller.listCategories)
router.get('/', controller.listPublic)
router.get('/:slug', controller.readPublic)

module.exports = router
