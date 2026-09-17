import { ApiError, apiRequest, clearToken, storeToken } from './httpClient'


/**
 * POST /api/auth/login on the Node backend returns { token, session }. The
 * token is kept in browser storage and sent with every later request;
 * sessionService.getSession() (GET /api/auth/me) is then the source of truth.
 */
export const authService = {
  login: async ({ email, password, remember = true }) => {
    const result = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
      isPublic: true,
    })

    if (!result?.token || !result?.session) {
      throw new ApiError(500, 'The server returned an unexpected login response.', 'INTERNAL')
    }

    storeToken(result.token, remember)
    return result
  },

  logout: async () => {
    clearToken()
    return { ok: true }
  },
}
