import { ApiError, apiRequest, getToken } from './httpClient'

export const sessionService = {
  /**
   * GET /api/auth/me — resolves the stored token back into the full session
   * (user, userType, permissions, features). A missing token short-circuits to
   * the same 401 the backend would return, without a network round-trip.
   */
  getSession: async () => {
    if (!getToken()) {
      throw new ApiError(401, 'You must be logged in.', 'UNAUTHORIZED')
    }
    return apiRequest('/auth/me')
  },
}
