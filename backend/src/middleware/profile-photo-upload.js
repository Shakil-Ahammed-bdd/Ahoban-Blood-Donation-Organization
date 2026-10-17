const multer = require('multer')
const HttpError = require('../errors/http-error')
const {
  hasValidImageSignature,
  validateAndNormalizeImage,
} = require('./experience-upload')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      callback(new HttpError(400, 'INVALID_PHOTO_TYPE', 'Upload a JPG, PNG, or WebP image.'))
      return
    }
    callback(null, true)
  },
})

function createProfilePhotoUpload({ required }) {
  return function handleProfilePhotoUpload(req, res, next) {
    upload.single('photo')(req, res, (error) => {
      if (error instanceof HttpError) return next(error)
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return next(new HttpError(413, 'PHOTO_TOO_LARGE', 'Photo must be 5 MB or smaller.'))
      }
      if (error instanceof multer.MulterError) {
        return next(new HttpError(400, 'INVALID_UPLOAD', 'Upload one valid profile photo.'))
      }
      if (error) return next(error)
      if (!req.file) {
        if (required) return next(new HttpError(400, 'PHOTO_REQUIRED', 'Choose a profile photo.'))
        return next()
      }
      if (!hasValidImageSignature(req.file)) {
        return next(new HttpError(400, 'INVALID_PHOTO_CONTENT', 'The uploaded file is not a supported image.'))
      }
      validateAndNormalizeImage(req.file).then(
        () => next(),
        (validationError) => next(
          validationError instanceof HttpError
            ? validationError
            : new HttpError(400, 'INVALID_PHOTO_CONTENT', 'The uploaded file is not a decodable image.'),
        ),
      )
    })
  }
}

const profilePhotoUpload = createProfilePhotoUpload({ required: true })
profilePhotoUpload.optional = createProfilePhotoUpload({ required: false })

module.exports = profilePhotoUpload
