import { Suspense, lazy } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { Navigate, Route, Routes } from 'react-router-dom'
import { BadgeCheck, Building2, KeyRound, Layers, ShieldCheck, ToggleRight } from 'lucide-react'
import { AppLayout } from '@/layouts/AppLayout'
import { PageContainer } from '@/components/PageContainer'
import { PERMISSIONS } from '@/constants/permissions'
import { FEATURES } from '@/constants/features'
import { ROUTES, workspaceViewPath } from '@/constants/routes'
import { RequirePermission } from './RequirePermission'
import { RequireFeature } from './RequireFeature'
import { RequireAuth } from './RequireAuth'

const lazyPage = (loader, exportName) =>
  lazy(() =>
    loader().then((module) => {
      const component = module[exportName]
      if (typeof component !== 'function') {
        throw new Error(
          `Route module did not provide "${exportName}" (got ${typeof component}). ` +
            'If the file looks right on disk, the dev server may have cached an empty read — a hard reload fixes it.',
        )
      }
      return { default: component }
    }),
  )

const LoginPage = lazyPage(() => import('@/features/auth/LoginPage'), 'LoginPage')
const DashboardPage = lazyPage(() => import('@/features/dashboard/DashboardPage'), 'DashboardPage')
const WorkspacePage = lazyPage(() => import('@/features/workspace/WorkspacePage'), 'WorkspacePage')
const WorkloadPage = lazyPage(() => import('@/features/workspace/WorkloadPage'), 'WorkloadPage')
const RecurringTasksPage = lazyPage(() => import('@/features/workspace/RecurringTasksPage'), 'RecurringTasksPage')
const ClientsPage = lazyPage(() => import('@/features/clients/ClientsPage'), 'ClientsPage')
const ClientDeskPage = lazyPage(() => import('@/features/clientdesk/ClientDeskPage'), 'ClientDeskPage')
const ActivityLogPage = lazyPage(() => import('@/features/activity/ActivityLogPage'), 'ActivityLogPage')
const UserTypesPage = lazyPage(() => import('@/features/admin/UserTypesPage'), 'UserTypesPage')
const DepartmentsPage = lazyPage(() => import('@/features/admin/DepartmentsPage'), 'DepartmentsPage')
const DesignationsPage = lazyPage(() => import('@/features/admin/DesignationsPage'), 'DesignationsPage')
const AccountsPage = lazyPage(() => import('@/features/admin/AccountsPage'), 'AccountsPage')
const AdminTabsLayoutLazy = lazyPage(() => import('@/features/admin/AdminTabsLayout'), 'AdminTabsLayout')
const PerformanceReviewsPage = lazyPage(
  () => import('@/features/performance/PerformanceReviewsPage'),
  'PerformanceReviewsPage',
)
const FeatureAccessPage = lazyPage(() => import('@/features/admin/FeatureAccessPage'), 'FeatureAccessPage')
const WorkspaceAdminPage = lazyPage(() => import('@/features/admin/WorkspaceAdminPage'), 'WorkspaceAdminPage')
const EmployeeListPage = lazyPage(() => import('@/features/employees/EmployeeListPage'), 'EmployeeListPage')
const EmployeeDetailPage = lazyPage(() => import('@/features/employees/EmployeeDetailPage'), 'EmployeeDetailPage')
const EmployeeImportPage = lazyPage(() => import('@/features/employees/EmployeeImportPage'), 'EmployeeImportPage')
const NotFoundPage = lazyPage(() => import('@/pages/NotFoundPage'), 'NotFoundPage')

const PageFallback = () => (
  <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 320 }}>
    <CircularProgress size={26} aria-label="Loading page" />
  </Box>
)

/** Legacy pages predate the per-page container, so they are padded here. */
const contained = (element) => <PageContainer>{element}</PageContainer>

const guarded = (element, { permission, feature, title }) => {
  let node = element
  if (permission) {
    node = (
      <RequirePermission permission={permission} title={title}>
        {node}
      </RequirePermission>
    )
  }
  if (feature) {
    node = <RequireFeature feature={feature}>{node}</RequireFeature>
  }
  return node
}

const WORKSPACE_ADMIN_PERMISSIONS = [
  PERMISSIONS.WORKSPACE_CREATE,
  PERMISSIONS.WORKSPACE_UPDATE,
  PERMISSIONS.GROUP_MANAGE,
  PERMISSIONS.TEAM_MANAGE,
  PERMISSIONS.STATUS_MANAGE,
]
const SETUP_PERMISSIONS = [...WORKSPACE_ADMIN_PERMISSIONS, PERMISSIONS.EMPLOYEE_UPDATE]
const ACCESS_PERMISSIONS = [
  PERMISSIONS.USERTYPE_VIEW,
  PERMISSIONS.USERTYPE_MANAGE,
  PERMISSIONS.ACCOUNT_MANAGE,
  PERMISSIONS.FEATURE_MANAGE,
]

const SETUP_TABS = [
  { label: 'Workspaces', to: ROUTES.adminWorkspaces, icon: Building2, permission: WORKSPACE_ADMIN_PERMISSIONS },
  { label: 'Departments', to: ROUTES.adminDepartments, icon: Layers, permission: PERMISSIONS.EMPLOYEE_UPDATE },
  { label: 'Designations', to: ROUTES.adminDesignations, icon: BadgeCheck, permission: PERMISSIONS.EMPLOYEE_UPDATE },
]
const ACCESS_TABS = [
  { label: 'User Types', to: ROUTES.adminUserTypes, icon: ShieldCheck, permission: PERMISSIONS.USERTYPE_VIEW },
  { label: 'Accounts', to: ROUTES.adminAccounts, icon: KeyRound, permission: PERMISSIONS.ACCOUNT_MANAGE },
  { label: 'Feature Access', to: ROUTES.adminFeatures, icon: ToggleRight, permission: PERMISSIONS.FEATURE_MANAGE },
]

export const AppRoutes = () => (
  <Suspense fallback={<PageFallback />}>
    <Routes>
      <Route path={ROUTES.login} element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={contained(<DashboardPage />)} />

          <Route path={ROUTES.workspace} element={<Navigate to={workspaceViewPath()} replace />} />

          {/* Reports is declared before the dynamic :view so it is not swallowed by it. */}
          <Route
            path={ROUTES.reports}
            element={guarded(<WorkloadPage />, {
              permission: PERMISSIONS.REPORT_VIEW,
              feature: FEATURES.REPORTS,
              title: 'Workload',
            })}
          />

          <Route
            path={ROUTES.recurring}
            element={guarded(<RecurringTasksPage />, {
              permission: PERMISSIONS.TASK_RECURRING,
              feature: FEATURES.RECURRING_TASKS,
              title: 'Recurring tasks',
            })}
          />

          {[ROUTES.workspaceView, ROUTES.groupView, ROUTES.teamView].map((path) => (
            <Route
              key={path}
              path={path}
              element={guarded(<WorkspacePage />, {
                permission: PERMISSIONS.TASK_VIEW,
                feature: FEATURES.WORKSPACES,
                title: 'Work',
              })}
            />
          ))}

          <Route
            path={ROUTES.clients}
            element={guarded(<ClientsPage />, {
              permission: PERMISSIONS.CLIENT_VIEW,
              feature: FEATURES.CLIENTS,
              title: 'Clients',
            })}
          />
          <Route
            path={ROUTES.clientDesk}
            element={guarded(<ClientDeskPage />, {
              permission: PERMISSIONS.TICKET_VIEW,
              title: 'Client Desk',
            })}
          />
          <Route
            path={ROUTES.activity}
            element={guarded(<ActivityLogPage />, {
              permission: PERMISSIONS.ACTIVITY_VIEW,
              feature: FEATURES.ACTIVITY_LOG,
              title: 'Activity Log',
            })}
          />

          <Route
            path={ROUTES.adminSetup}
            element={guarded(
              <AdminTabsLayoutLazy
                title="Setup"
                description="Workspaces, departments and designations — the structure everything else hangs on."
                tabs={SETUP_TABS}
              />,
              { permission: SETUP_PERMISSIONS, title: 'Setup' },
            )}
          >
            <Route index element={<Navigate to={ROUTES.adminWorkspaces} replace />} />
            <Route
              path="workspaces"
              element={guarded(<WorkspaceAdminPage />, {
                permission: WORKSPACE_ADMIN_PERMISSIONS,
                title: 'Workspaces',
              })}
            />
            <Route
              path="departments"
              element={guarded(<DepartmentsPage />, { permission: PERMISSIONS.EMPLOYEE_UPDATE, title: 'Departments' })}
            />
            <Route
              path="designations"
              element={guarded(<DesignationsPage />, {
                permission: PERMISSIONS.EMPLOYEE_UPDATE,
                title: 'Designations',
              })}
            />
          </Route>

          <Route
            path={ROUTES.adminAccess}
            element={guarded(
              <AdminTabsLayoutLazy
                title="Access"
                description="Who can sign in, what each role may do, and which features are switched on."
                tabs={ACCESS_TABS}
              />,
              { permission: ACCESS_PERMISSIONS, title: 'Access' },
            )}
          >
            <Route index element={<Navigate to={ROUTES.adminUserTypes} replace />} />
            <Route
              path="user-types"
              element={guarded(<UserTypesPage />, { permission: PERMISSIONS.USERTYPE_VIEW, title: 'User Types' })}
            />
            <Route
              path="accounts"
              element={guarded(<AccountsPage />, { permission: PERMISSIONS.ACCOUNT_MANAGE, title: 'Accounts' })}
            />
            <Route
              path="features"
              element={guarded(<FeatureAccessPage />, {
                permission: PERMISSIONS.FEATURE_MANAGE,
                title: 'Feature Access',
              })}
            />
          </Route>

          <Route path="/admin/workspaces" element={<Navigate to={ROUTES.adminWorkspaces} replace />} />
          <Route path="/admin/departments" element={<Navigate to={ROUTES.adminDepartments} replace />} />
          <Route path="/admin/designations" element={<Navigate to={ROUTES.adminDesignations} replace />} />
          <Route path="/admin/user-types" element={<Navigate to={ROUTES.adminUserTypes} replace />} />
          <Route path="/admin/accounts" element={<Navigate to={ROUTES.adminAccounts} replace />} />
          <Route path="/admin/features" element={<Navigate to={ROUTES.adminFeatures} replace />} />

          <Route
            path={ROUTES.employees}
            element={guarded(contained(<EmployeeListPage />), {
              permission: PERMISSIONS.EMPLOYEE_VIEW,
              feature: FEATURES.EMPLOYEES,
              title: 'Employees',
            })}
          />
          <Route
            path={ROUTES.employeeImport}
            element={guarded(contained(<EmployeeImportPage />), {
              permission: PERMISSIONS.EMPLOYEE_UPDATE,
              feature: FEATURES.EMPLOYEES,
              title: 'Import employees',
            })}
          />
          <Route
            path={ROUTES.employeeDetail}
            element={guarded(contained(<EmployeeDetailPage />), {
              permission: PERMISSIONS.EMPLOYEE_VIEW,
              feature: FEATURES.EMPLOYEES,
              title: 'Employee',
            })}
          />

          <Route
            path={ROUTES.performance}
            element={guarded(contained(<PerformanceReviewsPage />), {
              permission: PERMISSIONS.REVIEW_VIEW,
              feature: FEATURES.PERFORMANCE,
              title: 'Performance',
            })}
          />

          <Route path="*" element={contained(<NotFoundPage />)} />
        </Route>
      </Route>
    </Routes>
  </Suspense>
)
