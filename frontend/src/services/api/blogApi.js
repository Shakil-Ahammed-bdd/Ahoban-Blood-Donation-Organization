import { apiRequest } from './apiRequest'

export const blogApi = {
  list: ({ page = 1, limit = 9, category = '', search = '' } = {}) => {
    const params = new URLSearchParams({ page, limit })
    if (category) params.set('category', category)
    if (search) params.set('search', search)
    return apiRequest(`/blogs?${params}`)
  },
  read: (slug) => apiRequest(`/blogs/${encodeURIComponent(slug)}`),
}
