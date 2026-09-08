export const ROUTES = {
  dashboard: '/',
  employees: '/employees',
  employeeDetail: '/employees/:employeeId',
  recruitment: '/recruitment',
  interviewSchedule: '/recruitment/schedule',
  interviewReviews: '/recruitment/reviews',
  performance: '/performance',
  compensation: '/compensation',
  compensationOverview: '/compensation/overview',
  compensationIncrement: '/compensation/increment',
  compensationHistory: '/compensation/history',
  forbidden: '/access-restricted',
}

export const employeeDetailPath = (employeeId) => `/employees/${employeeId}`
