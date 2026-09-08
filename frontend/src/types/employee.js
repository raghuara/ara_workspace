/**
 * The employee domain deliberately carries no salary or compensation fields.
 * Compensation lives in its own domain and service so that it cannot leak into
 * employee, dashboard, recruitment or performance screens.
 *
 * @typedef {Object} Employee
 * @property {string} id
 * @property {string} employeeId
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} fullName
 * @property {string} email
 * @property {string} phone
 * @property {string} department
 * @property {string} designation
 * @property {string} joiningDate ISO date
 * @property {string} status
 * @property {string} employmentType
 * @property {string} workLocation
 * @property {string|null} reportingManagerId
 * @property {string|null} reportingManager
 * @property {string|null} avatarUrl
 * @property {PersonalInformation} personalInformation
 */

/**
 * @typedef {Object} PersonalInformation
 * @property {string} dateOfBirth ISO date
 * @property {string} gender
 * @property {string} maritalStatus
 * @property {string} nationality
 * @property {string} nationalId
 * @property {string} personalEmail
 * @property {string} addressLine1
 * @property {string} addressLine2
 * @property {string} city
 * @property {string} postalCode
 * @property {string} country
 * @property {EmergencyContact} emergencyContact
 */

/**
 * @typedef {Object} EmergencyContact
 * @property {string} name
 * @property {string} relationship
 * @property {string} phone
 */

/**
 * @typedef {Object} EmployeeDocument
 * @property {string} id
 * @property {string} employeeId
 * @property {string} name
 * @property {string} category
 * @property {string} uploadedOn ISO date
 * @property {string} sizeLabel
 */

/**
 * @typedef {Object} EmployeeQuery
 * @property {string} [search]
 * @property {string} [department]
 * @property {string} [status]
 * @property {number} [page]
 * @property {number} [pageSize]
 */

export {}
