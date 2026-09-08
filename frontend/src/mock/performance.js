import { PERFORMANCE_STATUS } from '@/constants/domain'
import { daysFromNow } from '@/utils/date'

const { DRAFT, IN_PROGRESS, PENDING_EMPLOYEE, COMPLETED } = PERFORMANCE_STATUS

const GOAL_LIBRARY = {
  Engineering: [
    'Reduce production incident rate by 30%',
    'Ship the workspace notifications service',
    'Mentor two junior engineers through onboarding',
    'Raise unit test coverage on core modules to 80%',
  ],
  Product: [
    'Deliver the Q3 roadmap commitments',
    'Run discovery interviews with 20 customers',
    'Improve activation rate by 15%',
    'Establish a quarterly release review ritual',
  ],
  Design: [
    'Publish the ARA design system v2',
    'Complete accessibility audit on core flows',
    'Reduce design-to-development handoff time',
    'Run monthly usability testing sessions',
  ],
  'Quality Assurance': [
    'Automate the regression suite for billing',
    'Cut average defect triage time to under 24h',
    'Introduce API contract testing',
    'Document release sign-off criteria',
  ],
  'Human Resources': [
    'Reduce average time-to-hire to 28 days',
    'Roll out the structured interview scorecard',
    'Complete the annual policy refresh',
    'Improve onboarding satisfaction score',
  ],
  Finance: [
    'Close monthly books within four working days',
    'Automate the expense approval workflow',
    'Complete the annual audit without findings',
    'Improve forecast accuracy to within 5%',
  ],
  Sales: [
    'Achieve 110% of annual quota',
    'Grow enterprise pipeline by 40%',
    'Reduce sales cycle length by two weeks',
    'Build three new referral partnerships',
  ],
  'Customer Success': [
    'Maintain CSAT above 4.5',
    'Reduce first response time to under 2 hours',
    'Publish 20 new knowledge base articles',
    'Cut churn among mid-market accounts',
  ],
}

const STRENGTH_LIBRARY = [
  'Consistently dependable delivery',
  'Strong collaboration across teams',
  'Clear and proactive communication',
  'Takes ownership of difficult problems',
  'High attention to detail',
  'Mentors others generously',
  'Calm and effective under pressure',
  'Strong customer empathy',
]

const IMPROVEMENT_LIBRARY = [
  'Delegate more instead of absorbing work',
  'Share progress updates earlier in the cycle',
  'Deepen domain knowledge outside the core area',
  'Give more direct feedback to peers',
  'Improve written documentation habits',
  'Balance perfectionism against delivery timelines',
]

const MANAGER_COMMENTS = [
  'A reliable contributor who has grown noticeably this cycle. Ready for more scope next period.',
  'Delivered consistently against agreed goals and handled shifting priorities well.',
  'Strong technical output. The next step is broadening influence beyond the immediate team.',
  'Good period overall. We agreed to focus on communication cadence in the coming quarter.',
  'Exceeded expectations on the primary objectives and supported the wider team throughout.',
]

const EMPLOYEE_COMMENTS = [
  'Thank you for the feedback. I would like more exposure to architecture decisions next cycle.',
  'I agree with the assessment and will focus on the improvement areas discussed.',
  'Appreciate the support this period. I would value clearer prioritisation earlier in the quarter.',
  '',
]

const STATUSES = [COMPLETED, COMPLETED, IN_PROGRESS, PENDING_EMPLOYEE, COMPLETED, DRAFT, IN_PROGRESS, COMPLETED]
const PERIODS = ['Annual 2025', 'H1 2026', 'Annual 2025', 'H1 2026']
const GOAL_STATUSES = ['On Track', 'Completed', 'At Risk']

const pick = (list, index) => list[index % list.length]

export const buildMockPerformanceReviews = (employees) =>
  employees
    .filter((employee) => employee.reportingManagerId)
    .map((employee, index) => {
      const departmentGoals = GOAL_LIBRARY[employee.department] ?? GOAL_LIBRARY.Engineering
      const goalCount = 2 + (index % 3)
      const status = pick(STATUSES, index)

      return {
        id: `PRV-${String(index + 1).padStart(4, '0')}`,
        employeeId: employee.id,
        employeeName: employee.fullName,
        department: employee.department,
        designation: employee.designation,
        reviewPeriod: pick(PERIODS, index),
        reviewerId: employee.reportingManagerId,
        reviewerName: employee.reportingManager ?? 'Unassigned',
        overallRating: Number((3 + ((index * 7) % 21) / 10).toFixed(1)),
        goals: Array.from({ length: goalCount }, (_, goalIndex) => ({
          id: `PRV-${index + 1}-G${goalIndex + 1}`,
          title: departmentGoals[(index + goalIndex) % departmentGoals.length],
          progress: Math.min(100, 40 + ((index + goalIndex) * 13) % 61),
          status: pick(GOAL_STATUSES, index + goalIndex),
        })),
        strengths: [
          pick(STRENGTH_LIBRARY, index),
          pick(STRENGTH_LIBRARY, index + 3),
          pick(STRENGTH_LIBRARY, index + 5),
        ],
        improvementAreas: [pick(IMPROVEMENT_LIBRARY, index), pick(IMPROVEMENT_LIBRARY, index + 2)],
        managerComments: pick(MANAGER_COMMENTS, index),
        employeeComments: status === COMPLETED ? pick(EMPLOYEE_COMMENTS, index) : '',
        status,
        updatedOn: daysFromNow(-(3 + (index % 45))),
      }
    })
