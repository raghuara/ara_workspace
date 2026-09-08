import { mockDocuments, mockEmployees } from '@/mock/employees'
import { buildMockInterviewReviews, buildMockInterviews } from '@/mock/recruitment'
import { buildMockPerformanceReviews } from '@/mock/performance'
import { buildMockCompensation, buildMockSalaryHistory } from '@/mock/compensation'
import { DEFAULT_ROLE_ID, findRole } from '@/mock/session'

const employees = mockEmployees.map((employee) => ({ ...employee }))
const employeeNameById = new Map(employees.map((employee) => [employee.id, employee.fullName]))

const interviews = buildMockInterviews(employeeNameById)
const interviewsById = new Map(interviews.map((interview) => [interview.id, interview]))
const interviewReviews = buildMockInterviewReviews(interviewsById, employeeNameById)

const performanceReviews = buildMockPerformanceReviews(employees)
const compensation = buildMockCompensation(employees)
const salaryHistory = buildMockSalaryHistory(compensation, employees)

export const db = {
  employees,
  documents: mockDocuments.map((document) => ({ ...document })),
  interviews,
  interviewReviews,
  performanceReviews,
  compensation,
  salaryHistory,
}

let activeRoleId = DEFAULT_ROLE_ID

export const getActiveRole = () => findRole(activeRoleId)

export const setActiveRole = (roleId) => {
  activeRoleId = findRole(roleId).id
  return getActiveRole()
}

export const nextId = (prefix, collection) =>
  `${prefix}-${String(collection.length + 1).padStart(4, '0')}`
