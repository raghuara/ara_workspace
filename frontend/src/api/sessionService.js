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

  // Role switching was a mock-only development aid. With real accounts each
  // login is one role, so the switcher has nothing to list.
  listRoles: async () => [],

  switchRole: async () => {
    throw new ApiError(400, 'Sign in with a different account to change role.', 'NOT_SUPPORTED')
  },
}
