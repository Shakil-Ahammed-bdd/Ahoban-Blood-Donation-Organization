const { randomUUID } = require('node:crypto')
const cloudinary = require('cloudinary').v2
const HttpError = require('../errors/http-error')

const CLOUDINARY_HOST = 'res.cloudinary.com'
let configuredCredentialKey = ''

function cloudinarySettings() {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME?.trim() || '',
    apiKey: process.env.CLOUDINARY_API_KEY?.trim() || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET?.trim() || '',
  }
}

function cloudinaryIsRequired() {
  return process.env.IMAGE_STORAGE === 'cloudinary' ||
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.RENDER_SERVICE_ID) ||
    process.env.RENDER === 'true'
}

function configureCloudinary() {
  const { cloudName, apiKey, apiSecret } = cloudinarySettings()
  const configuredValues = [cloudName, apiKey, apiSecret].filter(Boolean).length

  if (configuredValues === 0) {
    if (cloudinaryIsRequired()) {
      throw new HttpError(
        503,
        'IMAGE_STORAGE_UNAVAILABLE',
        'Image uploads require CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      )
    }
    return false
  }

  if (configuredValues !== 3) {
    throw new HttpError(
      503,
      'IMAGE_STORAGE_MISCONFIGURED',
      'Configure all three Cloudinary environment variables before uploading images.',
    )
  }

  const credentialKey = `${cloudName}\0${apiKey}\0${apiSecret}`
  if (configuredCredentialKey !== credentialKey) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    })
    configuredCredentialKey = credentialKey
  }
  return true
}

async function uploadToCloudinary(file, folder) {
  if (!configureCloudinary()) return null

  try {
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: `${Date.now()}-${randomUUID()}`,
          resource_type: 'image',
          format: 'webp',
          overwrite: false,
        },
        (error, uploaded) => error ? reject(error) : resolve(uploaded),
      ).end(file.buffer)
    })
    if (!result.secure_url?.startsWith('https://')) {
      throw new Error('Cloudinary returned no secure image URL.')
    }
    return result.secure_url
  } catch (error) {
    console.error('Cloudinary image upload failed.', error)
    throw new HttpError(502, 'IMAGE_STORAGE_FAILED', 'The image could not be saved to cloud storage.')
  }
}

function cloudinaryPublicId(imageUrl, expectedFolder) {
  if (typeof imageUrl !== 'string') return null

  let url
  try {
    url = new URL(imageUrl)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || url.hostname !== CLOUDINARY_HOST) return null

  const { cloudName } = cloudinarySettings()
  const segments = url.pathname.split('/').filter(Boolean)
  if (segments[0] !== cloudName || segments[1] !== 'image' || segments[2] !== 'upload') return null

  const versionIndex = segments.findIndex((segment, index) => index > 2 && /^v\d+$/.test(segment))
  const assetSegments = segments.slice(versionIndex > -1 ? versionIndex + 1 : 3)
  if (!assetSegments.length) return null

  const last = assetSegments.length - 1
  assetSegments[last] = assetSegments[last].replace(/\.(?:avif|gif|jpe?g|png|webp)$/i, '')
  const publicId = assetSegments.join('/')
  return publicId.startsWith(`${expectedFolder}/`) ? publicId : null
}

async function removeFromCloudinary(imageUrl, expectedFolder) {
  const publicId = cloudinaryPublicId(imageUrl, expectedFolder)
  if (!publicId) return false
  if (!configureCloudinary()) {
    throw new HttpError(503, 'IMAGE_STORAGE_UNAVAILABLE', 'Cloudinary credentials are required to remove this image.')
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      invalidate: true,
      resource_type: 'image',
    })
    if (!['ok', 'not found'].includes(result.result)) {
      throw new Error(`Unexpected Cloudinary deletion result: ${result.result}`)
    }
    return true
  } catch (error) {
    console.error('Cloudinary image deletion failed.', error)
    throw new HttpError(502, 'IMAGE_STORAGE_FAILED', 'The image could not be removed from cloud storage.')
  }
}

module.exports = { cloudinaryPublicId, removeFromCloudinary, uploadToCloudinary }
