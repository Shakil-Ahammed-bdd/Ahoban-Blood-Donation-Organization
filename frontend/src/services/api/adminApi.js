import { apiRequest } from './apiRequest'

export const adminApi = {
  overview: () => apiRequest('/admins/overview'),
  users: ({ page = 1, limit = 20 } = {}) =>
    apiRequest(`/admins/users?page=${page}&limit=${limit}`),
  pendingExperiences: ({ page = 1, limit = 20 } = {}) =>
    apiRequest(`/admins/experiences/pending?page=${page}&limit=${limit}`),
  approveExperience: (id) =>
    apiRequest(`/admins/experiences/${encodeURIComponent(id)}/approve`, { method: 'PATCH' }),
  rejectExperience: (id) =>
    apiRequest(`/admins/experiences/${encodeURIComponent(id)}/reject`, { method: 'PATCH' }),
  bloodRequests: ({ page = 1, limit = 20, status = 'pending' } = {}) =>
    apiRequest(`/admins/blood-requests?page=${page}&limit=${limit}&status=${encodeURIComponent(status)}`),
  moderateBloodRequest: (id, approvalStatus) =>
    apiRequest(`/admins/blood-requests/${encodeURIComponent(id)}/moderate`, {
      method: 'PATCH',
      body: { approvalStatus },
    }),
  fulfillBloodRequest: (id) =>
    apiRequest(`/admins/blood-requests/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: { status: 'fulfilled' },
    }),
  list: () => apiRequest('/admins'),
  create: (details) =>
    apiRequest('/admins', { method: 'POST', body: details }),
  update: (id, changes) =>
    apiRequest(`/admins/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: changes,
    }),
  delete: (id) =>
    apiRequest(`/admins/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
