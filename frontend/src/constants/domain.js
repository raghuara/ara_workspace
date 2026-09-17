export const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Design',
  'Quality Assurance',
  'Human Resources',
  'Finance',
  'Sales',
  'Customer Success',
]

export const EMPLOYMENT_STATUS = {
  ACTIVE: 'Active',
  PROBATION: 'Probation',
  NOTICE_PERIOD: 'Notice Period',
  INACTIVE: 'Inactive',
}

export const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Intern']

export const WORK_LOCATIONS = ['Colombo HQ', 'Kandy Office', 'Remote', 'Hybrid']

export const PERFORMANCE_STATUS = {
  DRAFT: 'Draft',
  IN_PROGRESS: 'In Progress',
  PENDING_EMPLOYEE: 'Pending Employee',
  COMPLETED: 'Completed',
}

export const GOAL_STATUSES = ['On Track', 'At Risk', 'Completed']

export const reviewPeriodOptions = (year = new Date().getFullYear()) =>
  [year, year - 1].flatMap((y) => [`H1 ${y}`, `H2 ${y}`, `Annual ${y}`])


