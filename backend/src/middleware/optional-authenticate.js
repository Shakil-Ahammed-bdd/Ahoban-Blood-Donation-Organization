const { authenticate } = require('./authenticate')

function optionalAuthenticate(req, res, next) {
  authenticate(req, res, (error) => {
    if (error?.statusCode === 401 || error?.status === 401) return next()
    next(error)
  })
}

module.exports = optionalAuthenticate
