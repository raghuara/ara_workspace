import { PERMISSIONS } from '@/constants/permissions'
import { INTERVIEW_STATUS } from '@/constants/domain'
import { db, nextId } from './mockDb'
import { mockRequest, notFound } from './httpClient'
import { DEFAULT_PAGE_SIZE, byDateAscending, byDateDescending, matchesSearch, paginate } from './queryUtils'

const resolveInterviewerName = (interviewerId) =>
  db.employees.find((employee) => employee.id === interviewerId)?.fullName ?? 'Unassigned'

const findInterview = (interviewId) => {
  const interview = db.interviews.find((candidate) => candidate.id === interviewId)
  if (!interview) throw notFound('That interview could not be found.')
  return interview
}

export const recruitmentService = {
  listInterviews: ({ search, status, type, page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) =>
    mockRequest(
      () => {
        const filtered = db.interviews
          .filter(
            (interview) =>
              matchesSearch(search, interview.candidateName, interview.position, interview.interviewerName) &&
              (!status || interview.status === status) &&
              (!type || interview.type === type),
          )
          .sort(byDateAscending('date'))

        return paginate(filtered, page, pageSize)
      },
      { requiredPermissions: [PERMISSIONS.INTERVIEW_VIEW] },
    ),

  getUpcomingInterviews: (limit = 5) =>
    mockRequest(
      () =>
        db.interviews
          .filter((interview) => interview.status === INTERVIEW_STATUS.SCHEDULED || interview.status === INTERVIEW_STATUS.RESCHEDULED)
          .sort(byDateAscending('date'))
          .slice(0, limit),
      { requiredPermissions: [PERMISSIONS.INTERVIEW_VIEW] },
    ),

  createInterview: (payload) =>
    mockRequest(
      () => {
        const interview = {
          id: nextId('INT', db.interviews),
          ...payload,
          interviewerName: resolveInterviewerName(payload.interviewerId),
          status: payload.status ?? INTERVIEW_STATUS.SCHEDULED,
        }
        db.interviews.push(interview)
        return interview
      },
      { requiredPermissions: [PERMISSIONS.INTERVIEW_UPDATE] },
    ),

  updateInterview: (interviewId, payload) =>
    mockRequest(
      () => {
        const interview = findInterview(interviewId)
        Object.assign(interview, payload, {
          interviewerName: payload.interviewerId
            ? resolveInterviewerName(payload.interviewerId)
            : interview.interviewerName,
        })
        return interview
      },
      { requiredPermissions: [PERMISSIONS.INTERVIEW_UPDATE] },
    ),

  listInterviewReviews: ({ search, recommendation, page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) =>
    mockRequest(
      () => {
        const filtered = db.interviewReviews
          .filter(
            (review) =>
              matchesSearch(search, review.candidateName, review.position, review.reviewerName) &&
              (!recommendation || review.recommendation === recommendation),
          )
          .sort(byDateDescending('submittedOn'))

        return paginate(filtered, page, pageSize)
      },
      { requiredPermissions: [PERMISSIONS.REVIEW_VIEW] },
    ),

  getInterviewReview: (reviewId) =>
    mockRequest(
      () => {
        const review = db.interviewReviews.find((candidate) => candidate.id === reviewId)
        if (!review) throw notFound('That interview review could not be found.')
        return review
      },
      { requiredPermissions: [PERMISSIONS.REVIEW_VIEW] },
    ),

  saveInterviewReview: (reviewId, payload) =>
    mockRequest(
      () => {
        const review = db.interviewReviews.find((candidate) => candidate.id === reviewId)
        if (!review) throw notFound('That interview review could not be found.')
        Object.assign(review, payload)
        return review
      },
      { requiredPermissions: [PERMISSIONS.REVIEW_UPDATE] },
    ),
}
