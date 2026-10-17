const HttpError = require('../errors/http-error')
const { isExperienceModerator } = require('../config/experience-moderators')

function requireExperienceModerator(req, res, next) {
  if (!isExperienceModerator(req.user)) {
    return next(new HttpError(403, 'MODERATOR_REQUIRED', 'You are not allowed to moderate experiences.'))
  }
  next()
}

module.exports = requireExperienceModerator
