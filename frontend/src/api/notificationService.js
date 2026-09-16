import { apiRequest, toQueryString } from './httpClient'

export const notificationService = {
  listNotifications: ({ limit = 20 } = {}) => apiRequest(`/notifications${toQueryString({ limit })}`),

  markRead: (notificationId) => apiRequest(`/notifications/${encodeURIComponent(notificationId)}/read`, { method: 'POST' }),

  markAllRead: () => apiRequest('/notifications/read-all', { method: 'POST' }),
}
