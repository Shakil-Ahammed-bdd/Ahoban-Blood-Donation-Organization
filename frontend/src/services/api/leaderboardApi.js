import { apiRequest } from './apiRequest'

export const leaderboardApi = {
  donors: () => apiRequest('/leaderboard/donors'),
}
