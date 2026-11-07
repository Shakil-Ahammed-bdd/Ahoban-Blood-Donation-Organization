import { apiRequest } from './apiRequest'

export const notificationApi = {
  list: ({ page = 1, limit = 10 } = {}) =>
    apiRequest(`/notifications?page=${page}&limit=${limit}`),
  markRead: (id) =>
    apiRequest(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' }),
  markAllRead: () =>
    apiRequest('/notifications/read-all', { method: 'PATCH' }),
}
