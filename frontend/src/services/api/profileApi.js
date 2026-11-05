import { apiRequest } from './apiRequest'

export const profileApi = {
  get: () => apiRequest('/users/profile'),
  update: (changes) =>
    apiRequest('/users/profile', { method: 'PATCH', body: changes }),
  logDonationDate: (donationDate) =>
    apiRequest('/users/profile/donation-history', {
      method: 'POST',
      body: { donationDate },
    }),
  updatePhoto: (formData) =>
    apiRequest('/users/profile/photo', { method: 'PUT', body: formData }),
  delete: () => apiRequest('/users/profile', { method: 'DELETE' }),
  public: (id) => apiRequest(`/users/${encodeURIComponent(id)}/profile`),
  experiences: (id, { page = 1, limit = 9 } = {}) =>
    apiRequest(`/users/${encodeURIComponent(id)}/experiences?page=${page}&limit=${limit}`),
}
