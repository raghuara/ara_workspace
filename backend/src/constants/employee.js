// Allowed values — mirrors frontend/src/constants/domain.js and the ENUM
// columns in the employees table.
const EMPLOYMENT_STATUSES = ["Active", "Probation", "Notice Period", "Inactive"];
const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Intern"];
const WORK_LOCATIONS = ["Colombo HQ", "Kandy Office", "Remote", "Hybrid"];

module.exports = {
  EMPLOYMENT_STATUSES,
  EMPLOYMENT_TYPES,
  WORK_LOCATIONS
};
