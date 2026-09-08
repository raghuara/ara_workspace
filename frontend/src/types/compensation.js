/**
 * Compensation is a separate, restricted data domain. It references employees
 * only by id and never embeds the employee record, so that a compensation
 * response can never be spread into an employee view by accident.
 *
 * @typedef {Object} CompensationRecord
 * @property {string} employeeId
 * @property {number} basicSalary
 * @property {number} allowances
 * @property {number} grossSalary
 * @property {string} currency
 * @property {string} payGrade
 * @property {string} effectiveDate ISO date
 * @property {string|null} lastIncrementDate ISO date
 */

/**
 * @typedef {Object} SalaryHistoryEntry
 * @property {string} id
 * @property {string} employeeId
 * @property {number} previousSalary
 * @property {number} incrementAmount
 * @property {number} newSalary
 * @property {string} effectiveDate ISO date
 * @property {string} reason
 * @property {string} approvedBy
 */

/**
 * @typedef {Object} IncrementDraft
 * @property {string} employeeId
 * @property {number} incrementAmount
 * @property {string} effectiveDate ISO date
 * @property {string} reason
 * @property {string} note
 */

export {}
