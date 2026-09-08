import { PERMISSIONS } from '@/constants/permissions'
import { PERFORMANCE_STATUS } from '@/constants/domain'
import { db } from './mockDb'
import { mockRequest, notFound } from './httpClient'
import { DEFAULT_PAGE_SIZE, byDateDescending, matchesSearch, paginate } from './queryUtils'

const findReview = (reviewId) => {
  const review = db.performanceReviews.find((candidate) => candidate.id === reviewId)
  if (!review) throw notFound('That performance review could not be found.')
  return review
}

export const performanceService = {
  listReviews: ({ search, status, department, reviewPeriod, page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) =>
    mockRequest(
      () => {
        const filtered = db.performanceReviews
          .filter(
            (review) =>
              matchesSearch(search, review.employeeName, review.reviewerName, review.designation) &&
              (!status || review.status === status) &&
              (!department || review.department === department) &&
              (!reviewPeriod || review.reviewPeriod === reviewPeriod),
          )
          .sort(byDateDescending('updatedOn'))

        return paginate(filtered, page, pageSize)
      },
      { requiredPermissions: [PERMISSIONS.REVIEW_VIEW] },
    ),

  getReview: (reviewId) =>
    mockRequest(() => findReview(reviewId), { requiredPermissions: [PERMISSIONS.REVIEW_VIEW] }),

  getReviewsByEmployee: (employeeId) =>
    mockRequest(
      () =>
        db.performanceReviews
          .filter((review) => review.employeeId === employeeId)
          .sort(byDateDescending('updatedOn')),
      { requiredPermissions: [PERMISSIONS.REVIEW_VIEW] },
    ),

  listPendingReviews: (limit = 5) =>
    mockRequest(
      () => {
        const pending = db.performanceReviews
          .filter((review) => review.status !== PERFORMANCE_STATUS.COMPLETED)
          .sort(byDateDescending('updatedOn'))

        return { total: pending.length, items: pending.slice(0, limit) }
      },
      { requiredPermissions: [PERMISSIONS.REVIEW_VIEW] },
    ),

  saveReview: (reviewId, payload) =>
    mockRequest(
      () => {
        const review = findReview(reviewId)
        Object.assign(review, payload, { updatedOn: new Date().toISOString().slice(0, 10) })
        return review
      },
      { requiredPermissions: [PERMISSIONS.REVIEW_UPDATE] },
    ),
}
