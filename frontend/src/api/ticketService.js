import { apiRequest, toQueryString } from './httpClient'

const id = (value) => encodeURIComponent(value)

export const ticketService = {
  listTickets: (filters = {}) => apiRequest(`/tickets${toQueryString(filters)}`),

  getTicket: (ticketId) => apiRequest(`/tickets/${id(ticketId)}`),

  createTicket: (payload) => apiRequest('/tickets', { method: 'POST', body: payload }),

  updateTicket: (ticketId, payload) => apiRequest(`/tickets/${id(ticketId)}`, { method: 'PUT', body: payload }),

  changeStatus: (ticketId, payload) =>
    apiRequest(`/tickets/${id(ticketId)}/status`, { method: 'POST', body: payload }),

  listEvents: (ticketId) => apiRequest(`/tickets/${id(ticketId)}/events`),

  addNote: (ticketId, note) => apiRequest(`/tickets/${id(ticketId)}/events`, { method: 'POST', body: { note } }),

  deleteTicket: (ticketId) => apiRequest(`/tickets/${id(ticketId)}`, { method: 'DELETE' }),
}
