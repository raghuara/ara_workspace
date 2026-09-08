import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  ReceiptText,
  TrendingUp,
  UserRoundPlus,
  Users,
  Wallet,
} from 'lucide-react'
import { PERMISSIONS } from './permissions'
import { ROUTES } from './routes'

export const NAVIGATION = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    to: ROUTES.dashboard,
    icon: LayoutDashboard,
    end: true,
  },
  {
    key: 'employees',
    label: 'Employees',
    to: ROUTES.employees,
    icon: Users,
    permission: PERMISSIONS.EMPLOYEE_VIEW,
  },
  {
    key: 'recruitment',
    label: 'Recruitment',
    icon: UserRoundPlus,
    children: [
      {
        key: 'interview-schedule',
        label: 'Interview Schedule',
        to: ROUTES.interviewSchedule,
        icon: CalendarDays,
        permission: PERMISSIONS.INTERVIEW_VIEW,
      },
      {
        key: 'interview-reviews',
        label: 'Interview Reviews',
        to: ROUTES.interviewReviews,
        icon: ClipboardList,
        permission: PERMISSIONS.REVIEW_VIEW,
      },
    ],
  },
  {
    key: 'performance',
    label: 'Performance',
    to: ROUTES.performance,
    icon: TrendingUp,
    permission: PERMISSIONS.REVIEW_VIEW,
  },
  {
    key: 'compensation',
    label: 'Compensation',
    icon: Wallet,
    restricted: true,
    children: [
      {
        key: 'compensation-overview',
        label: 'Salary Overview',
        to: ROUTES.compensationOverview,
        icon: Wallet,
        permission: PERMISSIONS.COMPENSATION_VIEW,
      },
      {
        key: 'compensation-increment',
        label: 'Increment',
        to: ROUTES.compensationIncrement,
        icon: TrendingUp,
        permission: PERMISSIONS.COMPENSATION_UPDATE,
      },
      {
        key: 'compensation-history',
        label: 'Salary History',
        to: ROUTES.compensationHistory,
        icon: ReceiptText,
        permission: PERMISSIONS.COMPENSATION_HISTORY_VIEW,
      },
    ],
  },
]
