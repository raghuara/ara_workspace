import { Box, Button, Divider, LinearProgress, Stack, Typography } from '@mui/material'
import { ArrowRight, CalendarDays, ClipboardList, UserRoundPlus, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { SectionCard } from '@/components/SectionCard'
import { StatCard } from '@/components/StatCard'
import { StatusChip } from '@/components/StatusChip'
import { UserAvatar } from '@/components/UserAvatar'
import { EmptyState } from '@/components/EmptyState'
import { QueryStateView } from '@/components/QueryStateView'
import { dashboardService } from '@/api/dashboardService'
import { recruitmentService } from '@/api/recruitmentService'
import { performanceService } from '@/api/performanceService'
import { PERMISSIONS } from '@/constants/permissions'
import { ROUTES, employeeDetailPath } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { usePermissions } from '@/hooks/usePermissions'
import { useSession } from '@/hooks/useSession'
import { colors } from '@/theme/tokens'
import { formatDate, formatRelativeDay, formatTime } from '@/utils/date'
import { formatNumber } from '@/utils/format'

const ListRow = ({ children, to }) => (
  <Box
    component={to ? Link : 'div'}
    to={to}
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      px: 2.5,
      py: 1.75,
      textDecoration: 'none',
      color: 'inherit',
      borderBottom: `1px solid ${colors.border}`,
      '&:last-of-type': { borderBottom: 0 },
      ...(to ? { '&:hover': { bgcolor: colors.page } } : {}),
    }}
  >
    {children}
  </Box>
)

export const DashboardPage = () => {
  const { user } = useSession()
  const { can } = usePermissions()

  const canViewEmployees = can(PERMISSIONS.EMPLOYEE_VIEW)
  const canViewInterviews = can(PERMISSIONS.INTERVIEW_VIEW)
  const canViewReviews = can(PERMISSIONS.REVIEW_VIEW)

  const stats = useAsync(dashboardService.getEmployeeStats, [], { enabled: canViewEmployees })
  const activity = useAsync(dashboardService.getRecentEmployeeActivity, [6], { enabled: canViewEmployees })
  const interviews = useAsync(recruitmentService.getUpcomingInterviews, [5], { enabled: canViewInterviews })
  const pendingReviews = useAsync(performanceService.listPendingReviews, [5], { enabled: canViewReviews })

  const maxDepartmentCount = stats.data?.departmentBreakdown?.[0]?.count ?? 1

  return (
    <Box>
      <PageHeader
        title={`Good day, ${user?.name?.split(' ')[0] ?? 'there'}`}
        description="Here is what is happening across the workspace today."
      />

      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          mb: 3,
        }}
      >
        {canViewEmployees ? (
          <>
            <StatCard
              label="Total Employees"
              value={formatNumber(stats.data?.totalEmployees)}
              helperText={`${stats.data?.onProbation ?? 0} on probation`}
              icon={Users}
              loading={stats.loading}
            />
            <StatCard
              label="New Employees"
              value={formatNumber(stats.data?.newEmployees)}
              helperText="Joined in the last 90 days"
              icon={UserRoundPlus}
              loading={stats.loading}
            />
          </>
        ) : null}
        {canViewInterviews ? (
          <StatCard
            label="Upcoming Interviews"
            value={formatNumber(interviews.data?.length)}
            helperText="Scheduled and rescheduled"
            icon={CalendarDays}
            loading={interviews.loading}
          />
        ) : null}
        {canViewReviews ? (
          <StatCard
            label="Pending Reviews"
            value={formatNumber(pendingReviews.data?.total)}
            helperText="Awaiting completion"
            icon={ClipboardList}
            loading={pendingReviews.loading}
          />
        ) : null}
      </Box>

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: '1.35fr 1fr' } }}>
        {canViewInterviews ? (
          <SectionCard
            title="Upcoming interviews"
            description="The next scheduled conversations"
            padded={false}
            action={
              <Button
                component={Link}
                to={ROUTES.interviewSchedule}
                size="small"
                endIcon={<ArrowRight size={15} strokeWidth={1.75} />}
              >
                View schedule
              </Button>
            }
          >
            <QueryStateView error={interviews.error} onRetry={interviews.reload}>
              {interviews.loading ? (
                <Box sx={{ p: 2.5 }}>
                  <LinearProgress aria-label="Loading upcoming interviews" />
                </Box>
              ) : interviews.data?.length ? (
                interviews.data.map((interview) => (
                  <ListRow key={interview.id}>
                    <UserAvatar name={interview.candidateName} size={34} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {interview.candidateName}
                      </Typography>
                      <Typography variant="caption" component="p" noWrap>
                        {interview.position} · {interview.type}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {formatRelativeDay(interview.date)}
                      </Typography>
                      <Typography variant="caption" component="p">
                        {formatTime(interview.time)}
                      </Typography>
                    </Box>
                  </ListRow>
                ))
              ) : (
                <EmptyState
                  icon={CalendarDays}
                  title="No upcoming interviews"
                  description="Scheduled interviews will appear here."
                />
              )}
            </QueryStateView>
          </SectionCard>
        ) : null}

        {canViewEmployees ? (
          <SectionCard title="Headcount by department" description="Across the whole organisation">
            <QueryStateView error={stats.error} onRetry={stats.reload}>
              {stats.loading ? (
                <LinearProgress aria-label="Loading headcount" />
              ) : (
                <Stack spacing={1.75}>
                  {(stats.data?.departmentBreakdown ?? []).map((row) => (
                    <Box key={row.department}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="body2">{row.department}</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {row.count}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={(row.count / maxDepartmentCount) * 100}
                        aria-label={`${row.department}: ${row.count} employees`}
                        sx={{ height: 5 }}
                      />
                    </Box>
                  ))}
                </Stack>
              )}
            </QueryStateView>
          </SectionCard>
        ) : null}

        {canViewEmployees ? (
          <SectionCard
            title="Recent employee activity"
            description="Most recent joiners"
            padded={false}
            action={
              <Button
                component={Link}
                to={ROUTES.employees}
                size="small"
                endIcon={<ArrowRight size={15} strokeWidth={1.75} />}
              >
                All employees
              </Button>
            }
          >
            <QueryStateView error={activity.error} onRetry={activity.reload}>
              {activity.loading ? (
                <Box sx={{ p: 2.5 }}>
                  <LinearProgress aria-label="Loading employee activity" />
                </Box>
              ) : (
                (activity.data ?? []).map((employee) => (
                  <ListRow key={employee.id} to={employeeDetailPath(employee.id)}>
                    <UserAvatar name={employee.fullName} size={34} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {employee.fullName}
                      </Typography>
                      <Typography variant="caption" component="p" noWrap>
                        {employee.designation} · {employee.department}
                      </Typography>
                    </Box>
                    <Stack alignItems="flex-end" spacing={0.5} sx={{ flexShrink: 0 }}>
                      <StatusChip status={employee.status} />
                      <Typography variant="caption">Joined {formatDate(employee.joiningDate)}</Typography>
                    </Stack>
                  </ListRow>
                ))
              )}
            </QueryStateView>
          </SectionCard>
        ) : null}

        {canViewReviews ? (
          <SectionCard
            title="Reviews needing attention"
            description="Performance reviews not yet completed"
            padded={false}
            action={
              <Button
                component={Link}
                to={ROUTES.performance}
                size="small"
                endIcon={<ArrowRight size={15} strokeWidth={1.75} />}
              >
                View all
              </Button>
            }
          >
            <QueryStateView error={pendingReviews.error} onRetry={pendingReviews.reload}>
              {pendingReviews.loading ? (
                <Box sx={{ p: 2.5 }}>
                  <LinearProgress aria-label="Loading pending reviews" />
                </Box>
              ) : pendingReviews.data?.items?.length ? (
                pendingReviews.data.items.map((review) => (
                  <ListRow key={review.id}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {review.employeeName}
                      </Typography>
                      <Typography variant="caption" component="p" noWrap>
                        {review.reviewPeriod} · Reviewer {review.reviewerName}
                      </Typography>
                    </Box>
                    <StatusChip status={review.status} />
                  </ListRow>
                ))
              ) : (
                <EmptyState
                  icon={ClipboardList}
                  title="All reviews are complete"
                  description="Nothing is waiting on you right now."
                />
              )}
            </QueryStateView>
          </SectionCard>
        ) : null}
      </Box>

      {!canViewEmployees && !canViewInterviews && !canViewReviews ? (
        <>
          <Divider sx={{ my: 3 }} />
          <EmptyState
            title="Nothing available for your role"
            description="Your account does not currently have access to any dashboard modules."
          />
        </>
      ) : null}
    </Box>
  )
}
