const { randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')

const imageDirectory = path.resolve(
  process.env.EXPERIENCE_IMAGE_DIR || path.join(__dirname, '../../uploads/experiences'),
)
const avatarDirectory = path.resolve(path.join(__dirname, '../../uploads/avatars'))

function extensionFor(mimeType) {
  return { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[mimeType]
}

async function storeImage(file) {
  const extension = extensionFor(file.mimetype)
  if (!extension) throw new Error('Unsupported experience photo format.')
  await fs.mkdir(imageDirectory, { recursive: true })
  const filename = `${randomUUID()}${extension}`
  await fs.writeFile(path.join(imageDirectory, filename), file.buffer, { flag: 'wx' })
  return `/api/uploads/experiences/${filename}`
}

async function storeImages(files) {
  const imageUrls = []
  try {
    for (const file of files) imageUrls.push(await storeImage(file))
    return imageUrls
  } catch (error) {
    await Promise.all(imageUrls.map(removeImage))
    throw error
  }
}

async function removeImage(imageUrl) {
  const prefix = '/api/uploads/experiences/'
  if (typeof imageUrl !== 'string' || !imageUrl.startsWith(prefix)) return
  const filename = imageUrl.slice(prefix.length)
  if (!/^[0-9a-f-]+\.(?:jpg|png|webp)$/i.test(filename)) return
  await fs.rm(path.join(imageDirectory, filename), { force: true })
}

async function removeImages(imageUrls) {
  await Promise.all((imageUrls || []).map(removeImage))
}

async function storeAvatar(file) {
  await fs.mkdir(avatarDirectory, { recursive: true })
  const filename = `${randomUUID()}.webp`
  await fs.writeFile(path.join(avatarDirectory, filename), file.buffer, { flag: 'wx' })
  return `/api/uploads/avatars/${filename}`
}

async function removeAvatar(imageUrl) {
  const prefix = '/api/uploads/avatars/'
  if (typeof imageUrl !== 'string' || !imageUrl.startsWith(prefix)) return
  const filename = imageUrl.slice(prefix.length)
  if (!/^[0-9a-f-]+\.webp$/i.test(filename)) return
  await fs.rm(path.join(avatarDirectory, filename), { force: true })
}

module.exports = {
  avatarDirectory,
  imageDirectory,
  removeAvatar,
  removeImage,
  removeImages,
  storeAvatar,
  storeImage,
  storeImages,
}
