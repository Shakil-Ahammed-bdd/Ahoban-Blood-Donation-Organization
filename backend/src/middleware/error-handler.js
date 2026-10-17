function errorHandler(error, req, res, next) {
  if (error.name === 'ValidationError' && error.errors) {
    const errors = Object.fromEntries(
      Object.entries(error.errors).map(([field, validationError]) => [
        field,
        validationError.message,
      ]),
    )
    const experienceRequest = req.path.startsWith('/api/experiences')
    return res.status(400).json({
      success: false,
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: experienceRequest ? 'Experience validation failed.' : 'Request validation failed.',
      errors,
      fieldErrors: errors,
    })
  }

  const statusCode = error.statusCode || error.status || 500

  if (statusCode >= 500) console.error(error)
  res.status(statusCode).json({
    success: false,
    status: 'error',
    code: error.code || 'INTERNAL_SERVER_ERROR',
    message:
      statusCode >= 500
        ? 'An unexpected server error occurred.'
        : error.message,
    ...(error.fieldErrors
      ? { errors: error.fieldErrors, fieldErrors: error.fieldErrors }
      : {}),
  })
}

module.exports = errorHandler
