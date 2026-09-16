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
const FeatureAccessPage = lazyPage(() => import('@/features/admin/FeatureAccessPage'), 'FeatureAccessPage')
const WorkspaceAdminPage = lazyPage(() => import('@/features/admin/WorkspaceAdminPage'), 'WorkspaceAdminPage')
const EmployeeListPage = lazyPage(() => import('@/features/employees/EmployeeListPage'), 'EmployeeListPage')
const EmployeeDetailPage = lazyPage(() => import('@/features/employees/EmployeeDetailPage'), 'EmployeeDetailPage')
const InterviewSchedulePage = lazyPage(() => import('@/features/recruitment/InterviewSchedulePage'), 'InterviewSchedulePage')
const InterviewReviewsPage = lazyPage(() => import('@/features/recruitment/InterviewReviewsPage'), 'InterviewReviewsPage')
const PerformanceReviewsPage = lazyPage(() => import('@/features/performance/PerformanceReviewsPage'), 'PerformanceReviewsPage')
const SalaryOverviewPage = lazyPage(() => import('@/features/compensation/SalaryOverviewPage'), 'SalaryOverviewPage')
const IncrementPage = lazyPage(() => import('@/features/compensation/IncrementPage'), 'IncrementPage')
const SalaryHistoryPage = lazyPage(() => import('@/features/compensation/SalaryHistoryPage'), 'SalaryHistoryPage')
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
            permission: PERMISSIONS.TASK_VIEW,
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
          element={guarded(<WorkspaceAdminPage />, { permission: PERMISSIONS.WORKSPACE_VIEW, title: 'Workspaces' })}
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
          path={ROUTES.adminDepartments}
          element={guarded(<DepartmentsPage />, { permission: PERMISSIONS.EMPLOYEE_UPDATE, title: 'Departments' })}
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

        <Route path={ROUTES.recruitment} element={<Navigate to={ROUTES.interviewSchedule} replace />} />
        <Route
          path={ROUTES.interviewSchedule}
          element={guarded(contained(<InterviewSchedulePage />), {
            permission: PERMISSIONS.INTERVIEW_VIEW,
            feature: FEATURES.RECRUITMENT,
            title: 'Interview Schedule',
          })}
        />
        <Route
          path={ROUTES.interviewReviews}
          element={guarded(contained(<InterviewReviewsPage />), {
            permission: PERMISSIONS.REVIEW_VIEW,
            feature: FEATURES.RECRUITMENT,
            title: 'Interview Reviews',
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

        <Route path={ROUTES.compensation} element={<Navigate to={ROUTES.compensationOverview} replace />} />
        <Route
          path={ROUTES.compensationOverview}
          element={guarded(contained(<SalaryOverviewPage />), {
            permission: PERMISSIONS.COMPENSATION_VIEW,
            feature: FEATURES.COMPENSATION,
            title: 'Salary Overview',
          })}
        />
        <Route
          path={ROUTES.compensationIncrement}
          element={guarded(contained(<IncrementPage />), {
            permission: PERMISSIONS.COMPENSATION_UPDATE,
            feature: FEATURES.COMPENSATION,
            title: 'Increment Management',
          })}
        />
        <Route
          path={ROUTES.compensationHistory}
          element={guarded(contained(<SalaryHistoryPage />), {
            permission: PERMISSIONS.COMPENSATION_HISTORY_VIEW,
            feature: FEATURES.COMPENSATION,
            title: 'Salary History',
          })}
        />

        <Route path="*" element={contained(<NotFoundPage />)} />
      </Route>
      </Route>
    </Routes>
  </Suspense>
)
