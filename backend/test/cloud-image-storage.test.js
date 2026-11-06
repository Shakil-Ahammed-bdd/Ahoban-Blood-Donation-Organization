const test = require('node:test')
const assert = require('node:assert/strict')
const { cloudinaryPublicId, uploadToCloudinary } = require('../src/services/cloud-image-storage')

test('extracts Cloudinary public IDs only from the expected cloud and folder', () => {
  const previousCloudName = process.env.CLOUDINARY_CLOUD_NAME
  process.env.CLOUDINARY_CLOUD_NAME = 'ahoban-test'

  try {
    assert.equal(
      cloudinaryPublicId(
        'https://res.cloudinary.com/ahoban-test/image/upload/v123456/ahoban/avatars/photo.webp',
        'ahoban/avatars',
      ),
      'ahoban/avatars/photo',
    )
    assert.equal(
      cloudinaryPublicId(
        'https://res.cloudinary.com/another-cloud/image/upload/v123456/ahoban/avatars/photo.webp',
        'ahoban/avatars',
      ),
      null,
    )
    assert.equal(
      cloudinaryPublicId(
        'https://res.cloudinary.com/ahoban-test/image/upload/v123456/ahoban/blogs/photo.webp',
        'ahoban/avatars',
      ),
      null,
    )
    assert.equal(
      cloudinaryPublicId('http://res.cloudinary.com/ahoban-test/image/upload/photo.webp', 'ahoban/avatars'),
      null,
    )
  } finally {
    if (previousCloudName === undefined) delete process.env.CLOUDINARY_CLOUD_NAME
    else process.env.CLOUDINARY_CLOUD_NAME = previousCloudName
  }
})

test('refuses production uploads when durable cloud storage is not configured', async () => {
  const previous = {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    nodeEnv: process.env.NODE_ENV,
    render: process.env.RENDER,
    renderServiceId: process.env.RENDER_SERVICE_ID,
    imageStorage: process.env.IMAGE_STORAGE,
  }
  delete process.env.CLOUDINARY_CLOUD_NAME
  delete process.env.CLOUDINARY_API_KEY
  delete process.env.CLOUDINARY_API_SECRET
  delete process.env.RENDER
  delete process.env.RENDER_SERVICE_ID
  process.env.NODE_ENV = 'production'
  delete process.env.IMAGE_STORAGE

  try {
    await assert.rejects(
      uploadToCloudinary({ buffer: Buffer.from('not an image') }, 'ahoban/avatars'),
      (error) => error.statusCode === 503 && error.code === 'IMAGE_STORAGE_UNAVAILABLE',
    )
  } finally {
    for (const [key, value] of Object.entries({
      CLOUDINARY_CLOUD_NAME: previous.cloudName,
      CLOUDINARY_API_KEY: previous.apiKey,
      CLOUDINARY_API_SECRET: previous.apiSecret,
      NODE_ENV: previous.nodeEnv,
      RENDER: previous.render,
      RENDER_SERVICE_ID: previous.renderServiceId,
      IMAGE_STORAGE: previous.imageStorage,
    })) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})
