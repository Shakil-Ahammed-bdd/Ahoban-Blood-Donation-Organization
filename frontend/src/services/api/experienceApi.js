import { apiRequest } from './apiRequest'

export const experienceApi = {
  list: ({ page = 1, limit = 9 } = {}) =>
    apiRequest(`/experiences?page=${page}&limit=${limit}`),
  read: (id) => apiRequest(`/experiences/${encodeURIComponent(id)}`),
  mine: () => apiRequest('/experiences/mine'),
  react: (id, type = 'love') =>
    apiRequest(`/experiences/${encodeURIComponent(id)}/reactions`, {
      method: 'POST',
      body: { type },
    }),
  unreact: (id) =>
    apiRequest(`/experiences/${encodeURIComponent(id)}/reactions`, { method: 'DELETE' }),
  comments: (id, { page = 1, limit = 5 } = {}) =>
    apiRequest(`/experiences/${encodeURIComponent(id)}/comments?page=${page}&limit=${limit}`),
  createComment: (id, content) =>
    apiRequest(`/experiences/${encodeURIComponent(id)}/comments`, {
      method: 'POST',
      body: { content },
    }),
  updateComment: (id, content) =>
    apiRequest(`/comments/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: { content },
    }),
  deleteComment: (id) =>
    apiRequest(`/comments/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  create: (formData) => apiRequest('/experiences', { method: 'POST', body: formData }),
  update: (id, formData) =>
    apiRequest(`/experiences/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: formData,
    }),
  delete: (id) =>
    apiRequest(`/experiences/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
