import { Building2, Headset, TrendingUp, History, LayoutDashboard, Settings2, ShieldCheck, Users } from 'lucide-react'
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
    permission: PERMISSIONS.DASHBOARD_VIEW,
    userTypeIds: [3],
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
        key: 'clientdesk',
        label: 'Client Desk',
        to: ROUTES.clientDesk,
        icon: Headset,
        permission: PERMISSIONS.TICKET_VIEW,
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
        hidden: true,
      },
    ],
  },
  {
    key: 'administration',
    label: 'Administration',
    children: [
      {
        key: 'admin-setup',
        label: 'Setup',
        to: ROUTES.adminSetup,
        icon: Settings2,
        permission: [
          PERMISSIONS.WORKSPACE_CREATE,
          PERMISSIONS.WORKSPACE_UPDATE,
          PERMISSIONS.GROUP_MANAGE,
          PERMISSIONS.TEAM_MANAGE,
          PERMISSIONS.STATUS_MANAGE,
          PERMISSIONS.EMPLOYEE_UPDATE,
        ],
      },
      {
        key: 'admin-access',
        label: 'Access',
        to: ROUTES.adminAccess,
        icon: ShieldCheck,
        permission: [
          PERMISSIONS.USERTYPE_VIEW,
          PERMISSIONS.USERTYPE_MANAGE,
          PERMISSIONS.ACCOUNT_MANAGE,
          PERMISSIONS.FEATURE_MANAGE,
        ],
      },
    ],
  },
]
