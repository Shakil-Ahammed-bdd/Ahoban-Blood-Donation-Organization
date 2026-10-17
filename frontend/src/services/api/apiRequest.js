export async function apiRequest(path, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
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
