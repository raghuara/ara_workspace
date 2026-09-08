/**
 * @typedef {Object} Interview
 * @property {string} id
 * @property {string} candidateName
 * @property {string} candidateEmail
 * @property {string} position
 * @property {string} department
 * @property {string} interviewerId
 * @property {string} interviewerName
 * @property {string} date ISO date
 * @property {string} time 24h HH:mm
 * @property {number} durationMinutes
 * @property {string} type
 * @property {string} status
 * @property {string} notes
 */

/**
 * @typedef {Object} InterviewReview
 * @property {string} id
 * @property {string} interviewId
 * @property {string} candidateName
 * @property {string} position
 * @property {string} reviewerId
 * @property {string} reviewerName
 * @property {string} submittedOn ISO date
 * @property {InterviewRatings} ratings
 * @property {string} recommendation
 * @property {string} notes
 */

/**
 * Each rating is scored 1-5.
 *
 * @typedef {Object} InterviewRatings
 * @property {number} technicalSkills
 * @property {number} communication
 * @property {number} problemSolving
 * @property {number} experience
 */

export {}
