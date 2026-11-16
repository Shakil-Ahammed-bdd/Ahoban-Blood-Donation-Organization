import { notifyMutationFailure, notifyMutationSuccess } from '../notificationEvents'

function getResponseMessage(data) {
  if (typeof data.message === 'string' && data.message.trim()) return data.message
  const fieldMessages = Object.values(data.errors || data.fieldErrors || {}).flat(2)
  return fieldMessages.find((message) => typeof message === 'string' && message.trim()) || ''
}

export async function apiRequest(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const isMutation = method !== 'GET' && method !== 'HEAD'
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const isJsonObject = options.body !== null
    && typeof options.body === 'object'
    && !isFormData
    && (Array.isArray(options.body)
      || Object.getPrototypeOf(options.body) === Object.prototype
      || Object.getPrototypeOf(options.body) === null)
  const body = isJsonObject ? JSON.stringify(options.body) : options.body
  let response
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      method,
      ...(body !== undefined ? { body } : {}),
      cache: options.cache || 'no-store',
      credentials: 'include',
      headers: {
        ...(isJsonObject || (options.body && !isFormData && typeof options.body === 'string')
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...options.headers,
      },
    })
  } catch (error) {
    if (isMutation) {
      notifyMutationFailure('নেটওয়ার্ক সংযোগ পাওয়া যাচ্ছে না। ইন্টারনেট যাচাই করে আবার চেষ্টা করুন।')
    }
    throw error
  }

  if (response.status === 204) {
    if (isMutation) notifyMutationSuccess(path, method)
    return null
  }

  const data = await response.json().catch(() => ({}))
  const operationFailed = !response.ok || data.success === false || data.status === 'error'
  if (operationFailed) {
    const statusCode = response.ok ? 400 : response.status
    const message = statusCode >= 500
      ? 'সার্ভারে সমস্যার কারণে কাজটি সম্পন্ন করা যায়নি। পরে আবার চেষ্টা করুন।'
      : getResponseMessage(data) || 'দুঃখিত, কাজটি সম্পন্ন করা যায়নি।'
    if (isMutation) {
      const type = [400, 409, 422].includes(statusCode) ? 'warning' : 'error'
      notifyMutationFailure(message, type)
    }
    const error = new Error(message)
    error.status = statusCode
    error.code = data.code
    error.fieldErrors = data.errors || data.fieldErrors || {}
    throw error
  }
  if (isMutation) notifyMutationSuccess(path, method)
  return data
}
