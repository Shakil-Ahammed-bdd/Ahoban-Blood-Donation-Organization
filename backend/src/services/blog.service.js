const mongoose = require('mongoose')
const Blog = require('../models/Blog')
const BlogCategory = require('../models/BlogCategory')
const HttpError = require('../errors/http-error')
const { removeBlogImage, storeBlogImage } = require('./blog-image-storage')
const { slugFromTitle, validateBlog } = require('../utils/blog-validation')
const { sanitizeBlogContent } = require('../utils/sanitize-blog-content')

const DEFAULT_CATEGORIES = [
  'Health Tips',
  'রক্তদানের উপকারিতা',
  'রক্তদান সম্পর্কে সচেতনতা',
  'রক্তদানের আগে ও পরে করণীয়',
  'Blood Group Information',
  'Healthy Lifestyle',
  'Blood Donation Myths & Facts',
]
let categoryInitialization = null

function ensureDatabase() {
  if (mongoose.connection.readyState !== 1) {
    throw new HttpError(503, 'DATABASE_UNAVAILABLE', 'Blog service is temporarily unavailable.')
  }
}

function categoryKey(name) {
  return name.normalize('NFKC').trim().toLocaleLowerCase()
}

function validateCategory(input, { partial = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpError(400, 'INVALID_BLOG_CATEGORY', 'Provide valid blog category details.')
  }
  const allowedFields = new Set(['name', 'description', 'active'])
  if (Object.keys(input).some((field) => !allowedFields.has(field))) {
    throw new HttpError(400, 'INVALID_BLOG_CATEGORY', 'The request contains unsupported category fields.')
  }
  const values = {}
  if (Object.hasOwn(input, 'name') || !partial) {
    if (typeof input.name !== 'string' || input.name.trim().length < 2 || input.name.trim().length > 60) {
      throw new HttpError(400, 'INVALID_BLOG_CATEGORY', 'Category name must be between 2 and 60 characters.')
    }
    values.name = input.name.trim()
  }
  if (Object.hasOwn(input, 'description') || !partial) {
    const description = input.description ?? ''
    if (typeof description !== 'string' || description.trim().length > 300) {
      throw new HttpError(400, 'INVALID_BLOG_CATEGORY', 'Category description must be 300 characters or fewer.')
    }
    values.description = description.trim()
  }
  if (Object.hasOwn(input, 'active')) {
    if (typeof input.active !== 'boolean') {
      throw new HttpError(400, 'INVALID_BLOG_CATEGORY', 'Category active status must be a boolean.')
    }
    values.active = input.active
  } else if (!partial) {
    values.active = true
  }
  return values
}

async function ensureBlogCategories() {
  if (categoryInitialization) return categoryInitialization
  categoryInitialization = (async () => {
    const existingCategories = await Blog.distinct('category')
    const names = new Set([...DEFAULT_CATEGORIES, ...existingCategories])
    for (const name of names) {
      await BlogCategory.updateOne(
        { key: categoryKey(name) },
        { $setOnInsert: { name, key: categoryKey(name), active: true } },
        { upsert: true },
      )
    }
  })()
  try {
    await categoryInitialization
  } catch (error) {
    categoryInitialization = null
    throw error
  }
}

function serializeCategory(category) {
  return {
    id: String(category._id),
    name: category.name,
    description: category.description || '',
    active: Boolean(category.active),
  }
}

function sanitizeAndValidateContent(content) {
  const sanitized = sanitizeBlogContent(content)
  const text = sanitized?.replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;/gi, ' ').trim()
  if (!sanitized || (!text && !/<(?:img|iframe)\b/i.test(sanitized))) {
    throw new HttpError(400, 'INVALID_BLOG', 'Blog content must include text or media.')
  }
  return sanitized
}

function serializeBlog(blog) {
  return {
    id: String(blog._id || blog.id),
    title: blog.title,
    slug: blog.slug,
    shortDescription: blog.shortDescription,
    coverImage: blog.coverImage,
    category: blog.category,
    content: sanitizeBlogContent(blog.content),
    author: blog.author,
    status: blog.status,
    publishAt: blog.publishAt,
    featured: Boolean(blog.featured),
    metaTitle: blog.metaTitle || blog.title,
    metaDescription: blog.metaDescription || blog.shortDescription,
    createdAt: blog.createdAt,
    updatedAt: blog.updatedAt,
  }
}

function buildSearchCriteria({ category, search, status } = {}, isAdmin = false) {
  const criteria = isAdmin
    ? (status ? { status } : {})
    : { status: 'published', publishAt: { $lte: new Date() } }
  if (category) criteria.category = category
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    criteria.$or = [
      { title: { $regex: escaped, $options: 'i' } },
      { shortDescription: { $regex: escaped, $options: 'i' } },
      { content: { $regex: escaped, $options: 'i' } },
      { category: { $regex: escaped, $options: 'i' } },
      { author: { $regex: escaped, $options: 'i' } },
    ]
  }
  return criteria
}

async function listBlogs({ page = 1, limit = 9, category = '', search = '', status = '' } = {}, isAdmin = false) {
  ensureDatabase()
  await ensureBlogCategories()
  const criteria = buildSearchCriteria({ category, search, status }, isAdmin)
  const [blogs, total, managedCategories, usedCategories, featured] = await Promise.all([
    Blog.find(criteria)
      .sort({ publishAt: -1, createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Blog.countDocuments(criteria),
    BlogCategory.find({ active: true }).sort({ name: 1 }).lean(),
    Blog.distinct('category', isAdmin ? {} : { status: 'published', publishAt: { $lte: new Date() } }),
    isAdmin
      ? Promise.resolve(null)
      : Blog.findOne({ status: 'published', featured: true, publishAt: { $lte: new Date() } })
        .sort({ publishAt: -1, createdAt: -1 })
        .lean(),
  ])
  return {
    blogs: blogs.map(serializeBlog),
    featuredBlog: featured ? serializeBlog(featured) : null,
    categories: [...new Set([...managedCategories.map(({ name }) => name), ...usedCategories])]
      .sort((left, right) => left.localeCompare(right)),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  }
}

async function getPublishedBlog(slug) {
  ensureDatabase()
  const blog = await Blog.findOne({
    slug,
    status: 'published',
    publishAt: { $lte: new Date() },
  }).lean()
  if (!blog) throw new HttpError(404, 'BLOG_NOT_FOUND', 'The blog post was not found.')
  return serializeBlog(blog)
}

async function createBlog(input, coverFile, userId) {
  ensureDatabase()
  await ensureBlogCategories()
  const values = validateBlog({
    ...input,
    ...(coverFile && !input.coverImage
      ? { coverImage: '/api/uploads/blogs/00000000-0000-0000-0000-000000000000.webp' }
      : {}),
  })
  values.content = sanitizeAndValidateContent(values.content)
  const category = await validateBlogCategoryStatus(values.category)
  values.category = category.name
  const slug = values.slug || slugFromTitle(values.title)
  let coverImage = values.coverImage
  if (coverFile) coverImage = await storeBlogImage(coverFile)
  let blog
  try {
    blog = await Blog.create({
      ...values,
      slug,
      coverImage,
      createdBy: userId,
    })
  } catch (error) {
    if (coverFile) await removeBlogImage(coverImage)
    if (error.code === 11000) {
      throw new HttpError(409, 'BLOG_SLUG_EXISTS', 'A blog with this slug already exists.')
    }
    throw error
  }
  return serializeBlog(blog)
}

async function updateBlog(id, input, coverFile) {
  ensureDatabase()
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'BLOG_NOT_FOUND', 'The blog post was not found.')
  const blog = await Blog.findById(id)
  if (!blog) throw new HttpError(404, 'BLOG_NOT_FOUND', 'The blog post was not found.')
  const values = validateBlog(input, { partial: true })
  if (Object.hasOwn(values, 'content')) {
    values.content = sanitizeAndValidateContent(values.content)
  }
  if (values.category && values.category !== blog.category) {
    const category = await validateBlogCategoryStatus(values.category)
    values.category = category.name
  }
  const previousCover = blog.coverImage
  const newCover = coverFile ? await storeBlogImage(coverFile) : null
  Object.assign(blog, values, ...(newCover ? [{ coverImage: newCover }] : []))
  try {
    await blog.save()
  } catch (error) {
    if (newCover) await removeBlogImage(newCover)
    if (error.code === 11000) {
      throw new HttpError(409, 'BLOG_SLUG_EXISTS', 'A blog with this slug already exists.')
    }
    throw error
  }
  if (newCover && previousCover !== newCover) await removeBlogImage(previousCover)
  return serializeBlog(blog)
}

async function deleteBlog(id) {
  ensureDatabase()
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'BLOG_NOT_FOUND', 'The blog post was not found.')
  const blog = await Blog.findByIdAndDelete(id)
  if (!blog) throw new HttpError(404, 'BLOG_NOT_FOUND', 'The blog post was not found.')
  await removeBlogImage(blog.coverImage)
}

async function listCategories(isAdmin = false) {
  ensureDatabase()
  await ensureBlogCategories()
  const [managedCategories, usedCategories] = await Promise.all([
    BlogCategory.find({ active: true }).sort({ name: 1 }).lean(),
    Blog.distinct('category', isAdmin ? {} : { status: 'published', publishAt: { $lte: new Date() } }),
  ])
  return [...new Set([...managedCategories.map(({ name }) => name), ...usedCategories])]
    .sort((left, right) => left.localeCompare(right))
}

async function listAdminCategories() {
  ensureDatabase()
  await ensureBlogCategories()
  const categories = await BlogCategory.find().sort({ name: 1 }).lean()
  return categories.map(serializeCategory)
}

async function createCategory(input) {
  ensureDatabase()
  const values = validateCategory(input)
  const normalizedName = values.name
  const key = categoryKey(normalizedName)
  const existing = await BlogCategory.findOne({ key })
  if (existing) {
    throw new HttpError(409, 'BLOG_CATEGORY_EXISTS', 'A blog category with this name already exists.')
  }
  try {
    return serializeCategory(await BlogCategory.create({ ...values, key }))
  } catch (error) {
    if (error.code === 11000) {
      throw new HttpError(409, 'BLOG_CATEGORY_EXISTS', 'A blog category with this name already exists.')
    }
    throw error
  }
}

async function updateCategory(id, input) {
  ensureDatabase()
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'BLOG_CATEGORY_NOT_FOUND', 'The blog category was not found.')
  const values = validateCategory(input, { partial: true })
  if (!Object.keys(values).length) {
    throw new HttpError(400, 'INVALID_BLOG_CATEGORY', 'Provide at least one category field to update.')
  }
  const category = await BlogCategory.findById(id)
  if (!category) throw new HttpError(404, 'BLOG_CATEGORY_NOT_FOUND', 'The blog category was not found.')
  if (values.name && values.name !== category.name) {
    const key = categoryKey(values.name)
    const duplicate = await BlogCategory.findOne({ key, _id: { $ne: category._id } })
    if (duplicate) throw new HttpError(409, 'BLOG_CATEGORY_EXISTS', 'A blog category with this name already exists.')
    await Blog.updateMany({ category: category.name }, { $set: { category: values.name } })
    category.name = values.name
    category.key = key
  }
  if (Object.hasOwn(values, 'description')) category.description = values.description
  if (Object.hasOwn(values, 'active')) category.active = values.active
  try {
    await category.save()
  } catch (error) {
    if (error.code === 11000) {
      throw new HttpError(409, 'BLOG_CATEGORY_EXISTS', 'A blog category with this name already exists.')
    }
    throw error
  }
  return serializeCategory(category)
}

async function deleteCategory(id) {
  ensureDatabase()
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'BLOG_CATEGORY_NOT_FOUND', 'The blog category was not found.')
  const category = await BlogCategory.findById(id)
  if (!category) throw new HttpError(404, 'BLOG_CATEGORY_NOT_FOUND', 'The blog category was not found.')
  const blogCount = await Blog.countDocuments({ category: category.name })
  if (blogCount) {
    throw new HttpError(
      409,
      'BLOG_CATEGORY_IN_USE',
      'This category is used by existing blog posts and cannot be deleted.',
    )
  }
  const result = await BlogCategory.deleteOne({ _id: category._id })
  if (result.deletedCount !== 1) {
    throw new HttpError(404, 'BLOG_CATEGORY_NOT_FOUND', 'The blog category was not found.')
  }
}

function validateBlogCategoryStatus(categoryName) {
  if (!categoryName) {
    throw new HttpError(400, 'BLOG_CATEGORY_INACTIVE', 'Select an active blog category.')
  }
  return BlogCategory.findOne({ key: categoryKey(categoryName), active: true }).then((category) => {
    if (!category) throw new HttpError(400, 'BLOG_CATEGORY_INACTIVE', 'Select an active blog category.')
    return category
  })
}

module.exports = {
  createBlog,
  createCategory,
  deleteBlog,
  deleteCategory,
  getPublishedBlog,
  listAdminCategories,
  listBlogs,
  listCategories,
  updateBlog,
  updateCategory,
}
