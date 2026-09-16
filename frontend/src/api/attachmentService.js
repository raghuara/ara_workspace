import { apiRequest } from './httpClient'

/**
 * Files attached to any record (employee documents, task images). The backend
 * stores the bytes in blob storage and returns short-lived links, so `url`
 * on a listed item is only valid for ~15 minutes — re-list rather than cache.
 */
export const attachmentService = {
  // GET /api/attachments?ownerType=employee&ownerId=EMP-0001
  list: (ownerType, ownerId) =>
    apiRequest(`/attachments?ownerType=${encodeURIComponent(ownerType)}&ownerId=${encodeURIComponent(ownerId)}`),

  // POST /api/attachments (multipart)
  upload: ({ ownerType, ownerId, file, category }) => {
    const form = new FormData()
    form.append('ownerType', ownerType)
    form.append('ownerId', ownerId)
    if (category) form.append('category', category)
    form.append('file', file)
    return apiRequest('/attachments', { method: 'POST', body: form })
  },

  // DELETE /api/attachments/:id — removes the stored file and its record.
  remove: (attachmentId) => apiRequest(`/attachments/${encodeURIComponent(attachmentId)}`, { method: 'DELETE' }),
}
