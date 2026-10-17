import { apiRequest } from './apiRequest'

export const authApi = {
  register: (details) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: details instanceof FormData ? details : JSON.stringify(details),
    }),
  login: (credentials) =>
    apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  me: () => apiRequest('/auth/me'),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
}
