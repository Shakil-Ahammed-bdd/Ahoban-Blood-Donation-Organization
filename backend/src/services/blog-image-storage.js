const { randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')

const blogImageDirectory = path.resolve(
  process.env.BLOG_IMAGE_DIR || path.join(__dirname, '../../uploads/blogs'),
)

async function storeBlogImage(file) {
  await fs.mkdir(blogImageDirectory, { recursive: true })
  const filename = `${randomUUID()}.webp`
  await fs.writeFile(path.join(blogImageDirectory, filename), file.buffer, { flag: 'wx' })
  return `/api/uploads/blogs/${filename}`
}

async function removeBlogImage(imageUrl) {
  const prefix = '/api/uploads/blogs/'
  if (typeof imageUrl !== 'string' || !imageUrl.startsWith(prefix)) return
  const filename = imageUrl.slice(prefix.length)
  if (!/^[0-9a-f-]+\.webp$/i.test(filename)) return
  await fs.rm(path.join(blogImageDirectory, filename), { force: true })
}

module.exports = { blogImageDirectory, removeBlogImage, storeBlogImage }
