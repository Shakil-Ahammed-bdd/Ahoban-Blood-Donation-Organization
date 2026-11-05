import { apiRequest } from './apiRequest'

export const authApi = {
  register: (details) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: details,
    }),
  login: (credentials) =>
    apiRequest('/auth/login', { method: 'POST', body: credentials }),
  me: () => apiRequest('/auth/me'),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
}
