import { apiRequest, toQueryString } from './httpClient'
import { DEFAULT_PAGE_SIZE } from './queryUtils'

const id = (value) => encodeURIComponent(value)

export const clientService = {
  listClients: ({ workspaceId, search, status, page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) =>
    apiRequest(`/clients${toQueryString({ workspaceId, search, status, page, pageSize })}`),

  listClientOptions: (workspaceId, { assignedOnly = false } = {}) =>
    apiRequest(`/clients/options${toQueryString({ workspaceId, assignedOnly: assignedOnly ? 'true' : '' })}`),

  createClient: (payload) => apiRequest('/clients', { method: 'POST', body: payload }),

  updateClient: (clientId, payload) => apiRequest(`/clients/${id(clientId)}`, { method: 'PUT', body: payload }),

  deleteClient: (clientId) => apiRequest(`/clients/${id(clientId)}`, { method: 'DELETE' }),
}
