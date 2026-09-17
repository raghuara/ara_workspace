import { apiRequest, toQueryString } from './httpClient'
import { DEFAULT_PAGE_SIZE } from './queryUtils'

const id = (value) => encodeURIComponent(value)

export const performanceService = {
  listReviews: ({ search, status, department, reviewPeriod, page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) =>
    apiRequest(`/performance/reviews${toQueryString({ search, status, department, reviewPeriod, page, pageSize })}`),

  getReview: (reviewId) => apiRequest(`/performance/reviews/${id(reviewId)}`),

  getReviewsByEmployee: (employeeId) => apiRequest(`/performance/reviews/employee/${id(employeeId)}`),

  listPendingReviews: (limit = 5) => apiRequest(`/performance/reviews/pending${toQueryString({ limit })}`),

  listPeriods: () => apiRequest('/performance/reviews/periods'),

  createReview: (payload) => apiRequest('/performance/reviews', { method: 'POST', body: payload }),

  saveReview: (reviewId, payload) => apiRequest(`/performance/reviews/${id(reviewId)}`, { method: 'PUT', body: payload }),

  deleteReview: (reviewId) => apiRequest(`/performance/reviews/${id(reviewId)}`, { method: 'DELETE' }),
}
