import { apiRequest } from './apiRequest'

export const experienceApi = {
  list: ({ page = 1, limit = 9 } = {}) =>
    apiRequest(`/experiences?page=${page}&limit=${limit}`),
  mine: () => apiRequest('/experiences/mine'),
  moderationQueue: () => apiRequest('/experiences/moderation/queue'),
  moderate: (id, status) =>
    apiRequest(`/experiences/${encodeURIComponent(id)}/moderation`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  react: (id, type = 'love') =>
    apiRequest(`/experiences/${encodeURIComponent(id)}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    }),
  unreact: (id) =>
    apiRequest(`/experiences/${encodeURIComponent(id)}/reactions`, { method: 'DELETE' }),
  comments: (id, { page = 1, limit = 5 } = {}) =>
    apiRequest(`/experiences/${encodeURIComponent(id)}/comments?page=${page}&limit=${limit}`),
  createComment: (id, content) =>
    apiRequest(`/experiences/${encodeURIComponent(id)}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  updateComment: (id, content) =>
    apiRequest(`/comments/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
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
