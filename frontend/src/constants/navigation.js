import {
  BadgeCheck,
  Building2,
  KeyRound,
  History,
  LayoutDashboard,
  Settings2,
  ShieldCheck,
  Users,
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
    permission: PERMISSIONS.DASHBOARD_VIEW,
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
        permission: [
          PERMISSIONS.WORKSPACE_CREATE,
          PERMISSIONS.WORKSPACE_UPDATE,
          PERMISSIONS.GROUP_MANAGE,
          PERMISSIONS.TEAM_MANAGE,
          PERMISSIONS.STATUS_MANAGE,
        ],
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
        key: 'admin-accounts',
        label: 'Accounts',
        to: ROUTES.adminAccounts,
        icon: KeyRound,
        permission: PERMISSIONS.USERTYPE_MANAGE,
      },
      {
        key: 'admin-departments',
        label: 'Departments',
        to: ROUTES.adminDepartments,
        icon: Building2,
        permission: PERMISSIONS.EMPLOYEE_UPDATE,
      },
      {
        key: 'admin-designations',
        label: 'Designations',
        to: ROUTES.adminDesignations,
        icon: BadgeCheck,
        permission: PERMISSIONS.EMPLOYEE_UPDATE,
      },
    ],
  },
]
