import { apiRequest } from './apiRequest'

export const bloodRequestApi = {
  list: ({ page = 1, limit = 12, bloodGroup = '', hospitalLocation = '', status = 'active' } = {}) => {
    const query = new URLSearchParams({ page: String(page), limit: String(limit), status })
    if (bloodGroup) query.set('bloodGroup', bloodGroup)
    if (hospitalLocation.trim()) query.set('hospitalLocation', hospitalLocation.trim())
    return apiRequest(`/blood-requests?${query}`)
  },
  create: (request) => apiRequest('/blood-requests', { method: 'POST', body: request }),
  updateStatus: (id, status, managementToken) => apiRequest(`/blood-requests/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: { status, managementToken },
  }),
}
