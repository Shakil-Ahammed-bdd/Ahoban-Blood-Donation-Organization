import { apiRequest } from './apiRequest'

export const liveImpactApi = {
  get: (options) => apiRequest('/stats/live-impact', options),
}
