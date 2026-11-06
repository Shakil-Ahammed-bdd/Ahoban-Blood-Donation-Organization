const fs = require('node:fs/promises')
const path = require('node:path')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

process.env.IMAGE_STORAGE = 'cloudinary'

const mongoose = require('mongoose')
const Blog = require('../src/models/Blog')
const Experience = require('../src/models/Experience')
const User = require('../src/models/User')
const {
  blogImageDirectory,
  removeBlogImage,
  storeBlogImage,
} = require('../src/services/blog-image-storage')
const {
  avatarDirectory,
  imageDirectory,
  removeAvatar,
  removeImages,
  storeAvatar,
  storeImages,
} = require('../src/services/experience-image-storage')

const LOCAL_IMAGE_PATH = /^\/api\/uploads\/(avatars|experiences|blogs)\/([0-9a-f-]+\.(?:jpg|jpeg|png|webp))$/i
const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

async function migrateOneImage(imageUrl, expectedType) {
  const match = typeof imageUrl === 'string' ? imageUrl.match(LOCAL_IMAGE_PATH) : null
  if (!match || match[1].toLowerCase() !== expectedType) return imageUrl

  const filename = match[2]
  const directory = expectedType === 'avatars'
    ? avatarDirectory
    : expectedType === 'experiences'
      ? imageDirectory
      : blogImageDirectory
  const filePath = path.join(directory, filename)
  let buffer
  try {
    buffer = await fs.readFile(filePath)
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Missing local source image: ${imageUrl}`)
    }
    throw error
  }

  const file = {
    buffer,
    mimetype: MIME_TYPES[path.extname(filename).toLowerCase()],
    originalname: filename,
  }
  const uploadedUrl = expectedType === 'avatars'
    ? await storeAvatar(file)
    : expectedType === 'experiences'
      ? (await storeImages([file]))[0]
      : await storeBlogImage(file)

  if (!uploadedUrl.startsWith('https://')) {
    throw new Error(`Cloudinary did not return a secure URL for ${imageUrl}`)
  }
  return uploadedUrl
}

async function releaseUploadedImages(urls) {
  await Promise.all(urls.map(async ({ type, url }) => {
    if (type === 'avatars') return removeAvatar(url)
    if (type === 'experiences') return removeImages([url])
    return removeBlogImage(url)
  }))
}

async function migrateUsers() {
  let migrated = 0
  const cursor = User.find({ profilePhotoUrl: /^\/api\/uploads\/avatars\// })
    .select('profilePhotoUrl updatedAt')
    .lean()
    .cursor()

  for await (const user of cursor) {
    const newUrl = await migrateOneImage(user.profilePhotoUrl, 'avatars')
    if (newUrl === user.profilePhotoUrl) continue
    try {
      const result = await User.updateOne(
        { _id: user._id, profilePhotoUrl: user.profilePhotoUrl },
        { $set: { profilePhotoUrl: newUrl } },
      )
      if (result.matchedCount) {
        migrated += 1
        continue
      }
    } catch (error) {
      await removeAvatar(newUrl)
      throw error
    }
    await removeAvatar(newUrl)
    throw new Error(`User ${user._id} changed during migration.`)
  }
  return migrated
}

async function migrateExperiences() {
  let migrated = 0
  const cursor = Experience.find({
    $or: [
      { images: /^\/api\/uploads\/experiences\// },
      { photoUrl: /^\/api\/uploads\/experiences\// },
    ],
  }).select('images photoUrl updatedAt').lean().cursor()

  for await (const experience of cursor) {
    const oldImages = experience.images?.length
      ? experience.images
      : [experience.photoUrl].filter(Boolean)
    const uploaded = []
    try {
      const newImages = await Promise.all(oldImages.map(async (url) => {
        const nextUrl = await migrateOneImage(url, 'experiences')
        if (nextUrl !== url) uploaded.push(nextUrl)
        return nextUrl
      }))
      const newPhotoUrl = newImages[0] || ''
      if (newImages.every((url, index) => url === oldImages[index]) && newPhotoUrl === experience.photoUrl) continue

      const result = await Experience.updateOne(
        { _id: experience._id, updatedAt: experience.updatedAt },
        { $set: { images: newImages, photoUrl: newPhotoUrl } },
      )
      if (!result.matchedCount) throw new Error(`Experience ${experience._id} changed during migration.`)
      migrated += uploaded.length
    } catch (error) {
      await releaseUploadedImages(uploaded.map((url) => ({ type: 'experiences', url })))
      throw error
    }
  }
  return migrated
}

async function migrateBlogs() {
  let migrated = 0
  const cursor = Blog.find({
    $or: [
      { coverImage: /^\/api\/uploads\/blogs\// },
      { content: /\/api\/uploads\/blogs\/[0-9a-f-]+\.(?:jpe?g|png|webp)/i },
    ],
  }).select('coverImage content updatedAt').lean().cursor()

  for await (const blog of cursor) {
    const localContentImages = [...new Set(
      (blog.content.match(/\/api\/uploads\/blogs\/[0-9a-f-]+\.(?:jpe?g|png|webp)/gi) || []),
    )]
    const urls = [...new Set([blog.coverImage, ...localContentImages])]
    const uploaded = []
    try {
      const replacements = new Map()
      for (const url of urls) {
        const nextUrl = await migrateOneImage(url, 'blogs')
        if (nextUrl !== url) uploaded.push(nextUrl)
        replacements.set(url, nextUrl)
      }

      const coverImage = replacements.get(blog.coverImage) || blog.coverImage
      let content = blog.content
      for (const [oldUrl, newUrl] of replacements) {
        if (oldUrl !== newUrl) content = content.split(oldUrl).join(newUrl)
      }
      if (!uploaded.length) continue

      const result = await Blog.updateOne(
        { _id: blog._id, updatedAt: blog.updatedAt },
        { $set: { coverImage, content } },
      )
      if (!result.matchedCount) throw new Error(`Blog ${blog._id} changed during migration.`)
      migrated += uploaded.length
    } catch (error) {
      await releaseUploadedImages(uploaded.map((url) => ({ type: 'blogs', url })))
      throw error
    }
  }
  return migrated
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI before running the migration.')
  await mongoose.connect(process.env.MONGODB_URI, {
    maxPoolSize: 5,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 10_000,
  })

  const counts = {
    avatars: await migrateUsers(),
    experiences: await migrateExperiences(),
    blogImages: await migrateBlogs(),
  }
  console.info('Image migration finished. Local source files were kept as a rollback backup.')
  console.info(`Migrated ${counts.avatars} avatars, ${counts.experiences} experience images, and ${counts.blogImages} blog images.`)
}

main()
  .catch((error) => {
    console.error(`Image migration failed: ${error.message}`)
    process.exitCode = 1
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
  })
