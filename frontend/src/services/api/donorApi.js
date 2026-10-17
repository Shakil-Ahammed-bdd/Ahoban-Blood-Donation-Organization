import { apiRequest } from './apiRequest'

export const donorApi = {
  list: (filters) => {
    const query = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== undefined && value !== null) query.set(key, value)
    })
    return apiRequest(`/donors?${query}`)
  },
  get: (id) => apiRequest(`/users/${encodeURIComponent(id)}/profile`),
  experiences: (id, { page = 1, limit = 9 } = {}) =>
    apiRequest(`/users/${encodeURIComponent(id)}/experiences?page=${page}&limit=${limit}`),
}
