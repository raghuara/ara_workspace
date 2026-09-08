import { Suspense, lazy } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { PERMISSIONS } from '@/constants/permissions'
import { ROUTES } from '@/constants/routes'
import { RequirePermission } from './RequirePermission'

const lazyPage = (loader, exportName) =>
  lazy(() => loader().then((module) => ({ default: module[exportName] })))

const DashboardPage = lazyPage(() => import('@/features/dashboard/DashboardPage'), 'DashboardPage')
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

export const AppRoutes = () => (
  <Suspense fallback={<PageFallback />}>
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />

        <Route
          path={ROUTES.employees}
          element={
            <RequirePermission permission={PERMISSIONS.EMPLOYEE_VIEW} title="Employees">
              <EmployeeListPage />
            </RequirePermission>
          }
        />
        <Route
          path={ROUTES.employeeDetail}
          element={
            <RequirePermission permission={PERMISSIONS.EMPLOYEE_VIEW} title="Employee">
              <EmployeeDetailPage />
            </RequirePermission>
          }
        />

        <Route path={ROUTES.recruitment} element={<Navigate to={ROUTES.interviewSchedule} replace />} />
        <Route
          path={ROUTES.interviewSchedule}
          element={
            <RequirePermission permission={PERMISSIONS.INTERVIEW_VIEW} title="Interview Schedule">
              <InterviewSchedulePage />
            </RequirePermission>
          }
        />
        <Route
          path={ROUTES.interviewReviews}
          element={
            <RequirePermission permission={PERMISSIONS.REVIEW_VIEW} title="Interview Reviews">
              <InterviewReviewsPage />
            </RequirePermission>
          }
        />

        <Route
          path={ROUTES.performance}
          element={
            <RequirePermission permission={PERMISSIONS.REVIEW_VIEW} title="Performance">
              <PerformanceReviewsPage />
            </RequirePermission>
          }
        />

        <Route path={ROUTES.compensation} element={<Navigate to={ROUTES.compensationOverview} replace />} />
        <Route
          path={ROUTES.compensationOverview}
          element={
            <RequirePermission permission={PERMISSIONS.COMPENSATION_VIEW} title="Salary Overview">
              <SalaryOverviewPage />
            </RequirePermission>
          }
        />
        <Route
          path={ROUTES.compensationIncrement}
          element={
            <RequirePermission permission={PERMISSIONS.COMPENSATION_UPDATE} title="Increment Management">
              <IncrementPage />
            </RequirePermission>
          }
        />
        <Route
          path={ROUTES.compensationHistory}
          element={
            <RequirePermission permission={PERMISSIONS.COMPENSATION_HISTORY_VIEW} title="Salary History">
              <SalaryHistoryPage />
            </RequirePermission>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  </Suspense>
)
