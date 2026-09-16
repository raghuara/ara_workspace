import { Suspense, lazy } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { Navigate, Route, Routes } from 'react-router-dom'
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
const ActivityLogPage = lazyPage(() => import('@/features/activity/ActivityLogPage'), 'ActivityLogPage')
const UserTypesPage = lazyPage(() => import('@/features/admin/UserTypesPage'), 'UserTypesPage')
const DepartmentsPage = lazyPage(() => import('@/features/admin/DepartmentsPage'), 'DepartmentsPage')
const DesignationsPage = lazyPage(() => import('@/features/admin/DesignationsPage'), 'DesignationsPage')
const AccountsPage = lazyPage(() => import('@/features/admin/AccountsPage'), 'AccountsPage')
const FeatureAccessPage = lazyPage(() => import('@/features/admin/FeatureAccessPage'), 'FeatureAccessPage')
const WorkspaceAdminPage = lazyPage(() => import('@/features/admin/WorkspaceAdminPage'), 'WorkspaceAdminPage')
const EmployeeListPage = lazyPage(() => import('@/features/employees/EmployeeListPage'), 'EmployeeListPage')
const EmployeeDetailPage = lazyPage(() => import('@/features/employees/EmployeeDetailPage'), 'EmployeeDetailPage')
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
          path={ROUTES.activity}
          element={guarded(<ActivityLogPage />, {
            permission: PERMISSIONS.ACTIVITY_VIEW,
            feature: FEATURES.ACTIVITY_LOG,
            title: 'Activity Log',
          })}
        />

        <Route
          path={ROUTES.adminWorkspaces}
          element={guarded(<WorkspaceAdminPage />, {
            permission: [
              PERMISSIONS.WORKSPACE_CREATE,
              PERMISSIONS.WORKSPACE_UPDATE,
              PERMISSIONS.GROUP_MANAGE,
              PERMISSIONS.TEAM_MANAGE,
              PERMISSIONS.STATUS_MANAGE,
            ],
            title: 'Workspaces',
          })}
        />
        <Route
          path={ROUTES.adminUserTypes}
          element={guarded(<UserTypesPage />, { permission: PERMISSIONS.USERTYPE_VIEW, title: 'User Types' })}
        />
        <Route
          path={ROUTES.adminFeatures}
          element={guarded(<FeatureAccessPage />, { permission: PERMISSIONS.FEATURE_MANAGE, title: 'Feature Access' })}
        />
        <Route
          path={ROUTES.adminAccounts}
          element={guarded(<AccountsPage />, { permission: PERMISSIONS.USERTYPE_MANAGE, title: 'Accounts' })}
        />
        <Route
          path={ROUTES.adminDepartments}
          element={guarded(<DepartmentsPage />, { permission: PERMISSIONS.EMPLOYEE_UPDATE, title: 'Departments' })}
        />
        <Route
          path={ROUTES.adminDesignations}
          element={guarded(<DesignationsPage />, { permission: PERMISSIONS.EMPLOYEE_UPDATE, title: 'Designations' })}
        />

        <Route
          path={ROUTES.employees}
          element={guarded(contained(<EmployeeListPage />), {
            permission: PERMISSIONS.EMPLOYEE_VIEW,
            feature: FEATURES.EMPLOYEES,
            title: 'Employees',
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


        <Route path="*" element={contained(<NotFoundPage />)} />
      </Route>
      </Route>
    </Routes>
  </Suspense>
)
