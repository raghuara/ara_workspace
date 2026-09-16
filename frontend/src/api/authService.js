import { ApiError, apiRequest, clearToken, storeToken } from './httpClient'

export const DEMO_PASSWORD = 'Admin@123'

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

  // JWTs are stateless: signing out is simply forgetting the token.
  logout: async () => {
    clearToken()
    return { ok: true }
  },

  /** Development-only: the accounts the login screen offers to fill in. */
  listDemoAccounts: async () => [
    {
      roleId: 'master-admin',
      name: 'Shanika Peiris',
      email: 'shanika.peiris@araworkspace.com',
      designation: 'HR Manager',
      userTypeId: 1,
    },
  ],
}
