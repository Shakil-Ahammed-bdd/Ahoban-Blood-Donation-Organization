const HttpError = require('../errors/http-error')
const clientOrigin = require('../config/client-origin')

function verifyOrigin(req, res, next) {
  const origin = req.get('origin')

  if (origin && origin !== clientOrigin) {
    return next(new HttpError(403, 'ORIGIN_NOT_ALLOWED', 'This request origin is not allowed.'))
  }
  next()
}

module.exports = verifyOrigin
