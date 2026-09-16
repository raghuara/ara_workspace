import {
  Building2,
  CalendarDays,
  ClipboardList,
  History,
  LayoutDashboard,
  ReceiptText,
  Settings2,
  ShieldCheck,
  TrendingUp,
  UserRoundPlus,
  Users,
  Wallet,
} from 'lucide-react'
import { PERMISSIONS } from './permissions'
import { FEATURES } from './features'
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
    key: 'organisation',
    label: 'Organisation',
    children: [
      {
        key: 'clients',
        label: 'Clients',
        to: ROUTES.clients,
        icon: Building2,
        permission: PERMISSIONS.CLIENT_VIEW,
        feature: FEATURES.CLIENTS,
      },
      {
        key: 'employees',
        label: 'Employees',
        to: ROUTES.employees,
        icon: Users,
        permission: PERMISSIONS.EMPLOYEE_VIEW,
        feature: FEATURES.EMPLOYEES,
      },
      {
        key: 'activity',
        label: 'Activity Log',
        to: ROUTES.activity,
        icon: History,
        permission: PERMISSIONS.ACTIVITY_VIEW,
        feature: FEATURES.ACTIVITY_LOG,
      },
      {
        key: 'performance',
        label: 'Performance',
        to: ROUTES.performance,
        icon: TrendingUp,
        permission: PERMISSIONS.REVIEW_VIEW,
        feature: FEATURES.PERFORMANCE,
      },
    ],
  },
  {
    key: 'recruitment',
    label: 'Recruitment',
    feature: FEATURES.RECRUITMENT,
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
    key: 'compensation',
    label: 'Compensation',
    restricted: true,
    feature: FEATURES.COMPENSATION,
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
        icon: UserRoundPlus,
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
  {
    key: 'administration',
    label: 'Administration',
    children: [
      {
        key: 'admin-workspaces',
        label: 'Workspaces',
        to: ROUTES.adminWorkspaces,
        icon: Settings2,
        permission: PERMISSIONS.WORKSPACE_VIEW,
      },
      {
        key: 'admin-user-types',
        label: 'User Types',
        to: ROUTES.adminUserTypes,
        icon: ShieldCheck,
        permission: PERMISSIONS.USERTYPE_VIEW,
      },
      {
        key: 'admin-features',
        label: 'Feature Access',
        to: ROUTES.adminFeatures,
        icon: Settings2,
        permission: PERMISSIONS.FEATURE_MANAGE,
      },
      {
        key: 'admin-departments',
        label: 'Departments',
        to: ROUTES.adminDepartments,
        icon: Building2,
        permission: PERMISSIONS.EMPLOYEE_UPDATE,
      },
    ],
  },
]
