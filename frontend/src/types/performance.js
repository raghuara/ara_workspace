/**
 * @typedef {Object} PerformanceReview
 * @property {string} id
 * @property {string} employeeId
 * @property {string} employeeName
 * @property {string} department
 * @property {string} designation
 * @property {string} reviewPeriod
 * @property {string} reviewerId
 * @property {string} reviewerName
 * @property {number} overallRating 1-5
 * @property {PerformanceGoal[]} goals
 * @property {string[]} strengths
 * @property {string[]} improvementAreas
 * @property {string} managerComments
 * @property {string} employeeComments
 * @property {string} status
 * @property {string} updatedOn ISO date
 */

/**
 * @typedef {Object} PerformanceGoal
 * @property {string} id
 * @property {string} title
 * @property {number} progress 0-100
 * @property {string} status
 */

export {}
