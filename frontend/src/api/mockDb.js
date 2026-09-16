import { mockEmployees } from '@/mock/employees'
import { buildMockInterviewReviews, buildMockInterviews } from '@/mock/recruitment'
import { buildMockPerformanceReviews } from '@/mock/performance'
import { buildMockCompensation, buildMockSalaryHistory } from '@/mock/compensation'

const employees = mockEmployees.map((employee) => ({ ...employee }))
const employeeNameById = new Map(employees.map((employee) => [employee.id, employee.fullName]))

const interviews = buildMockInterviews(employeeNameById)
const interviewsById = new Map(interviews.map((interview) => [interview.id, interview]))
const interviewReviews = buildMockInterviewReviews(interviewsById, employeeNameById)

const performanceReviews = buildMockPerformanceReviews(employees)
const compensation = buildMockCompensation(employees)
const salaryHistory = buildMockSalaryHistory(compensation, employees)

let currentUser = { id: null, name: 'Current user' }

export const db = {
  employees,
  interviews,
  interviewReviews,
  performanceReviews,
  compensation,
  salaryHistory,
}

export const syncMockIdentity = (session) => {
  if (session?.user) currentUser = { id: session.user.id, name: session.user.name }
}

export const getCurrentUser = () => currentUser

export const nextId = (prefix, collection, width = 4) =>
  `${prefix}-${String(collection.length + 1).padStart(width, '0')}`
