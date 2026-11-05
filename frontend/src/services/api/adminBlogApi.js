import { apiRequest } from './apiRequest'

export const adminBlogApi = {
  list: ({ page = 1, limit = 20, category = '', search = '', status = '' } = {}) => {
    const params = new URLSearchParams({ page, limit })
    if (category) params.set('category', category)
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    return apiRequest(`/admins/blogs?${params}`)
  },
  listCategories: () => apiRequest('/admins/blogs/categories'),
  createCategory: (category) =>
    apiRequest('/admins/blogs/categories', { method: 'POST', body: category }),
  updateCategory: (id, category) =>
    apiRequest(`/admins/blogs/categories/${encodeURIComponent(id)}`, { method: 'PATCH', body: category }),
  deleteCategory: (id) =>
    apiRequest(`/admins/blogs/categories/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  create: (formData) => apiRequest('/admins/blogs', { method: 'POST', body: formData }),
  update: (id, formData) =>
    apiRequest(`/admins/blogs/${encodeURIComponent(id)}`, { method: 'PATCH', body: formData }),
  delete: (id) => apiRequest(`/admins/blogs/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
