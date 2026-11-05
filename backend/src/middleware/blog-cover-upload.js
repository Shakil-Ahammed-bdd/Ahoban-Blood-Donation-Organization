const multer = require('multer')
const HttpError = require('../errors/http-error')
const { validateAndNormalizeImage } = require('./experience-upload')

const MAX_COVER_BYTES = 5 * 1024 * 1024
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_COVER_BYTES, files: 1 },
  fileFilter(req, file, callback) {
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      callback(new HttpError(400, 'INVALID_BLOG_IMAGE_TYPE', 'Upload a JPG, PNG, or WebP cover image.'))
      return
    }
    callback(null, true)
  },
})

function blogCoverUpload(req, res, next) {
  upload.single('coverImage')(req, res, (error) => {
    if (error) {
      if (error instanceof HttpError) return next(error)
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return next(new HttpError(413, 'BLOG_IMAGE_TOO_LARGE', 'Cover image must be 5 MB or smaller.'))
      }
      if (error instanceof multer.MulterError) {
        return next(new HttpError(400, 'INVALID_BLOG_IMAGE', 'Upload one valid cover image.'))
      }
      return next(error)
    }
    if (!req.file) return next()
    validateAndNormalizeImage(req.file)
      .then(() => next())
      .catch((validationError) => next(
        validationError instanceof HttpError
          ? validationError
          : new HttpError(400, 'INVALID_BLOG_IMAGE', 'The cover file is not a decodable image.'),
      ))
  })
}

module.exports = blogCoverUpload
