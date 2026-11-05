const { randomUUID } = require('node:crypto')
const HttpError = require('../errors/http-error')

const ALLOWED_FIELDS = new Set([
  'title',
  'slug',
  'shortDescription',
  'coverImage',
  'category',
  'content',
  'author',
  'status',
  'publishAt',
  'featured',
  'metaTitle',
  'metaDescription',
])

function slugFromTitle(value) {
  const slug = String(value || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 180)
  return slug || `blog-${randomUUID().slice(0, 8)}`
}

function validateBlog(input, { partial = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpError(400, 'INVALID_BLOG', 'Provide valid blog details.')
  }
  const unknownFields = Object.keys(input).filter((field) => !ALLOWED_FIELDS.has(field))
  if (unknownFields.length) {
    throw new HttpError(400, 'INVALID_BLOG', 'The request contains unsupported blog fields.')
  }

  const values = {}
  const textFields = [
    ['title', 180, 3],
    ['shortDescription', 320, 10],
    ['category', 60, 2],
    ['content', 100000, 1],
    ['author', 100, 2],
    ['metaTitle', 180, 0],
    ['metaDescription', 320, 0],
  ]
  for (const [field, maxLength, minLength] of textFields) {
    if (partial && !Object.hasOwn(input, field)) continue
    const value = input[field] ?? (minLength === 0 ? '' : undefined)
    if (typeof value !== 'string' || value.trim().length < minLength || value.trim().length > maxLength) {
      throw new HttpError(400, 'INVALID_BLOG', `Enter valid ${field} text.`, {
        [field]: `Must be between ${minLength} and ${maxLength} characters.`,
      })
    }
    values[field] = value.trim()
  }

  if (Object.hasOwn(input, 'slug') || Object.hasOwn(input, 'title') || !partial) {
    const slug = typeof input.slug === 'string' && input.slug.trim()
      ? input.slug.trim().toLowerCase()
      : slugFromTitle(input.title)
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 200) {
      throw new HttpError(400, 'INVALID_BLOG_SLUG', 'Use a URL-friendly slug with lowercase letters, numbers, and hyphens.')
    }
    values.slug = slug
  }

  if (Object.hasOwn(input, 'coverImage') || !partial) {
    const coverImage = input.coverImage
    if (
      typeof coverImage !== 'string' ||
      coverImage.length > 500 ||
      !(/^(?:\/api\/uploads\/blogs\/[0-9a-f-]+\.webp|https:\/\/[^\s]+)$/i).test(coverImage)
    ) {
      throw new HttpError(400, 'INVALID_BLOG_COVER', 'Upload a cover image or provide a secure HTTPS image URL.')
    }
    values.coverImage = coverImage
  }

  if (Object.hasOwn(input, 'status')) {
    if (!['draft', 'published'].includes(input.status)) {
      throw new HttpError(400, 'INVALID_BLOG_STATUS', 'Blog status must be draft or published.')
    }
    values.status = input.status
  } else if (!partial) {
    values.status = 'draft'
  }

  if (Object.hasOwn(input, 'publishAt')) {
    const publishAt = new Date(input.publishAt)
    if (Number.isNaN(publishAt.getTime())) {
      throw new HttpError(400, 'INVALID_BLOG_DATE', 'Enter a valid publish date.')
    }
    values.publishAt = publishAt
  } else if (!partial) {
    values.publishAt = new Date()
  }

  if (Object.hasOwn(input, 'featured')) {
    if (typeof input.featured !== 'boolean') {
      throw new HttpError(400, 'INVALID_BLOG', 'featured must be a boolean.')
    }
    values.featured = input.featured
  } else if (!partial) {
    values.featured = false
  }

  return values
}

module.exports = { slugFromTitle, validateBlog }
