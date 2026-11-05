const HttpError = require('../errors/http-error')
const blogService = require('../services/blog.service')

function parsePagination(query, defaultLimit = 9) {
  const page = Number(query.page ?? 1)
  const limit = Number(query.limit ?? defaultLimit)
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new HttpError(400, 'INVALID_PAGINATION', 'Page must be positive and limit must be from 1 to 50.')
  }
  return { page, limit }
}

function getFilters(query, isAdmin = false) {
  const category = typeof query.category === 'string' ? query.category.trim().slice(0, 60) : ''
  const search = typeof query.search === 'string' ? query.search.trim().slice(0, 100) : ''
  const status = typeof query.status === 'string' ? query.status : ''
  if (isAdmin && status && !['draft', 'published'].includes(status)) {
    throw new HttpError(400, 'INVALID_BLOG_STATUS', 'Filter status must be draft or published.')
  }
  return { category, search, ...(isAdmin ? { status } : {}) }
}

function normalizeBody(body = {}) {
  const result = { ...body }
  if (typeof result.featured === 'string') {
    if (!['true', 'false'].includes(result.featured)) {
      throw new HttpError(400, 'INVALID_BLOG', 'featured must be a boolean.')
    }
    result.featured = result.featured === 'true'
  }
  return result
}

async function listPublic(req, res, next) {
  try {
    const result = await blogService.listBlogs({
      ...parsePagination(req.query),
      ...getFilters(req.query),
    })
    res.json({ success: true, status: 'ok', ...result })
  } catch (error) {
    next(error)
  }
}

async function listCategories(req, res, next) {
  try {
    const categories = await blogService.listCategories()
    res.json({ success: true, status: 'ok', categories })
  } catch (error) {
    next(error)
  }
}

async function readPublic(req, res, next) {
  try {
    const blog = await blogService.getPublishedBlog(req.params.slug)
    res.json({ success: true, status: 'ok', blog })
  } catch (error) {
    next(error)
  }
}

async function listAdmin(req, res, next) {
  try {
    const result = await blogService.listBlogs({
      ...parsePagination(req.query, 20),
      ...getFilters(req.query, true),
    }, true)
    res.json({ success: true, status: 'ok', ...result })
  } catch (error) {
    next(error)
  }
}

async function create(req, res, next) {
  try {
    const blog = await blogService.createBlog(normalizeBody(req.body), req.file, req.user._id)
    res.status(201).json({ success: true, status: 'ok', message: 'Blog created.', blog })
  } catch (error) {
    next(error)
  }
}

async function update(req, res, next) {
  try {
    const blog = await blogService.updateBlog(req.params.id, normalizeBody(req.body), req.file)
    res.json({ success: true, status: 'ok', message: 'Blog updated.', blog })
  } catch (error) {
    next(error)
  }
}

async function remove(req, res, next) {
  try {
    await blogService.deleteBlog(req.params.id)
    res.status(204).end()
  } catch (error) {
    next(error)
  }
}

function getCategoryBody(body = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'INVALID_BLOG_CATEGORY', 'Provide valid blog category details.')
  }
  return body
}

async function listAdminCategories(req, res, next) {
  try {
    const categories = await blogService.listAdminCategories()
    res.json({ success: true, status: 'ok', categories })
  } catch (error) {
    next(error)
  }
}

async function createCategory(req, res, next) {
  try {
    const category = await blogService.createCategory(getCategoryBody(req.body))
    res.status(201).json({ success: true, status: 'ok', category })
  } catch (error) {
    next(error)
  }
}

async function updateCategory(req, res, next) {
  try {
    const category = await blogService.updateCategory(req.params.id, getCategoryBody(req.body))
    res.json({ success: true, status: 'ok', category })
  } catch (error) {
    next(error)
  }
}

async function removeCategory(req, res, next) {
  try {
    await blogService.deleteCategory(req.params.id)
    res.status(204).end()
  } catch (error) {
    next(error)
  }
}

module.exports = {
  create,
  createCategory,
  listAdmin,
  listAdminCategories,
  listCategories,
  listPublic,
  readPublic,
  remove,
  removeCategory,
  update,
  updateCategory,
}
