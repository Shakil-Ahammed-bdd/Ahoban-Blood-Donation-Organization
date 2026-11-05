export async function apiRequest(path, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const isJsonObject = options.body !== null
    && typeof options.body === 'object'
    && !isFormData
    && (Array.isArray(options.body)
      || Object.getPrototypeOf(options.body) === Object.prototype
      || Object.getPrototypeOf(options.body) === null)
  const body = isJsonObject ? JSON.stringify(options.body) : options.body
  const response = await fetch(`/api${path}`, {
    ...options,
    ...(body !== undefined ? { body } : {}),
    credentials: 'include',
    headers: {
      ...(isJsonObject || (options.body && !isFormData && typeof options.body === 'string')
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options.headers,
    },
  })

  if (response.status === 204) return null

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.message || 'The request could not be completed.')
    error.status = response.status
    error.code = data.code
    error.fieldErrors = data.errors || data.fieldErrors || {}
    throw error
  }
  return data
}
