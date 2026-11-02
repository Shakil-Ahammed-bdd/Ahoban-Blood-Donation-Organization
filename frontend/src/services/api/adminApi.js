import { apiRequest } from './apiRequest'

export const adminApi = {
  overview: () => apiRequest('/admins/overview'),
  users: ({ page = 1, limit = 20 } = {}) =>
    apiRequest(`/admins/users?page=${page}&limit=${limit}`),
  list: () => apiRequest('/admins'),
  create: (details) =>
    apiRequest('/admins', { method: 'POST', body: JSON.stringify(details) }),
  update: (id, changes) =>
    apiRequest(`/admins/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(changes),
    }),
  delete: (id) =>
    apiRequest(`/admins/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
