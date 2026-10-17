const multer = require('multer')
const sharp = require('sharp')
const HttpError = require('../errors/http-error')

const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const MAX_PHOTOS = 5
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: MAX_PHOTOS },
  fileFilter(req, file, callback) {
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      callback(new HttpError(400, 'INVALID_PHOTO_TYPE', 'Upload a JPG, PNG, or WebP image.'))
      return
    }
    callback(null, true)
  },
})

function hasValidImageSignature(file) {
  const bytes = file.buffer
  if (
    ['image/jpeg', 'image/jpg'].includes(file.mimetype) &&
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return true
  }
  if (
    file.mimetype === 'image/png' &&
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return true
  }
  return (
    file.mimetype === 'image/webp' &&
    bytes.length >= 12 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP'
  )
}

async function experienceUpload(req, res, next) {
  upload.array('photos', MAX_PHOTOS)(req, res, (error) => {
    if (error) {
      if (error instanceof HttpError) return next(error)
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return next(new HttpError(413, 'PHOTO_TOO_LARGE', 'Photo must be 5 MB or smaller.'))
      }
      if (
        error instanceof multer.MulterError &&
        ['LIMIT_FILE_COUNT', 'LIMIT_UNEXPECTED_FILE'].includes(error.code)
      ) {
        return next(new HttpError(400, 'TOO_MANY_PHOTOS', 'Upload no more than five photos.'))
      }
      if (error instanceof multer.MulterError) {
        return next(new HttpError(400, 'INVALID_UPLOAD', 'Upload between one and five valid experience photos.'))
      }
      return next(error)
    }

    const files = req.files || []
    Promise.all(files.map(async (file) => {
      if (!hasValidImageSignature(file)) {
        throw new HttpError(400, 'INVALID_PHOTO_CONTENT', 'The uploaded file is not a supported image.')
      }
      await validateAndNormalizeImage(file)
    }))
      .then(() => {
        req.body.photos = files.length > 0
        next()
      })
      .catch((validationError) => {
        next(validationError instanceof HttpError
          ? validationError
          : new HttpError(
            400,
            'INVALID_PHOTO_CONTENT',
            'The uploaded file is not a decodable image.',
          ))
      })
  })
}

async function validateAndNormalizeImage(file) {
  const data = await sharp(file.buffer, {
    failOn: 'warning',
    limitInputPixels: 25_000_000,
  })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80, effort: 4 })
    .toBuffer()

  if (data.length > MAX_PHOTO_BYTES) {
    throw new HttpError(413, 'PHOTO_TOO_LARGE', 'Photo must be 5 MB or smaller.')
  }

  file.buffer = data
  file.size = data.length
  file.mimetype = 'image/webp'
}

module.exports = experienceUpload
module.exports.hasValidImageSignature = hasValidImageSignature
module.exports.validateAndNormalizeImage = validateAndNormalizeImage
