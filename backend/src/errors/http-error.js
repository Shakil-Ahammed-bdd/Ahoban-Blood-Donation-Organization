class HttpError extends Error {
  constructor(statusCode, code, message, fieldErrors) {
    super(message)
    this.name = 'HttpError'
    this.statusCode = statusCode
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

module.exports = HttpError
