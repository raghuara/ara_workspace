import { useMemo } from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'
import { ArrowRight, CircleCheck, ClipboardList, Clock3, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { SectionCard } from '@/components/SectionCard'
import { StatCard } from '@/components/StatCard'
import { EmptyState } from '@/components/EmptyState'
import { QueryStateView } from '@/components/QueryStateView'
import { StatusChip } from '@/components/StatusChip'
import { ToneChip } from '@/components/ToneChip'
import { DashboardSkeleton } from '@/components/Skeletons'
import { ColumnChart, DonutChart, ProgressRows } from '@/components/charts/BarChart'
import { taskService } from '@/api/taskService'
import { dashboardService } from '@/api/dashboardService'
import { PERMISSIONS } from '@/constants/permissions'
import { FEATURES } from '@/constants/features'
import { workspaceViewPath } from '@/constants/routes'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { useAsync } from '@/hooks/useAsync'
import { useFeatures } from '@/hooks/useFeatures'
import { usePermissions } from '@/hooks/usePermissions'
import { useSession } from '@/hooks/useSession'
import { usePeriod } from '@/hooks/usePeriod'
import { useWorkspace } from '@/hooks/useWorkspace'
import { colors } from '@/theme/tokens'
import { formatLongDate, formatRelativeDay, toIsoDate } from '@/utils/date'
import { RecentActivityTable } from './RecentActivityTable'
import { TeamsTable } from './TeamsTable'
import { ClientDeskSummaryCard } from './ClientDeskSummaryCard'
import { WorkspaceSummaryCard } from './WorkspaceSummaryCard'

const GAP = 1.5

export const WorkspaceDashboard = () => {
  const { user } = useSession()
  const { can } = usePermissions()
  const { isEnabled } = useFeatures()
  const { activeWorkspace, activeWorkspaceId } = useWorkspace()

  const canViewTasks = can(PERMISSIONS.TASK_VIEW) && isEnabled(FEATURES.WORKSPACES)

  const { yearRange, yearLabel } = usePeriod()
  const board = useAsync(taskService.getBoard, [activeWorkspaceId, yearRange], {
    enabled: canViewTasks && Boolean(activeWorkspaceId),
  })
  const overview = useAsync(dashboardService.getOverview, [yearRange], { enabled: canViewTasks })
  const mine = overview.data?.workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null

  const stats = useMemo(() => {
    const columns = board.data?.columns ?? []
    const all = columns.flatMap((column) => column.tasks)
    const today = toIsoDate(new Date())
    const open = all.filter((task) => task.statusKind !== 'completed')

    return {
      mine: open.filter((task) => task.assigneeIds.includes(user?.id)).length,
      dueToday: open.filter((task) => task.dueDate === today).length,
      overdue: open.filter((task) => task.isOverdue).length,
      completedPoints: all.filter((task) => task.statusKind === 'completed').reduce((sum, task) => sum + task.points, 0),
      myTasks: open
        .filter((task) => task.assigneeIds.includes(user?.id))
        .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
        .slice(0, 6),
    }
  }, [board.data, user?.id])

  if (!canViewTasks) {
    return (
      <Box>
        <PageHeader title={`Good day, ${user?.name?.split(' ')[0] ?? 'there'}`} />
        <EmptyState title="Nothing available for your role" description="Your account does not currently have access to any work modules." />
      </Box>
    )
  }

  const loading = (board.loading && !board.data) || (overview.loading && !overview.data)

  return (
    <Box>
      <PageHeader
        title={`Good day, ${user?.name?.split(' ')[0] ?? 'there'}`}
        description={`${formatLongDate(toIsoDate(new Date()))} · FY ${yearLabel} · ${activeWorkspace ? `Here is where ${activeWorkspace.name} stands today.` : 'Here is where things stand today.'}`}
        actions={
          <Button component={Link} to={workspaceViewPath('board')} variant="contained" size="small" endIcon={<ArrowRight size={14} strokeWidth={2} />}>
            Open board
          </Button>
        }
      />

      <QueryStateView error={board.error ?? overview.error} onRetry={() => { board.reload(); overview.reload() }}>
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <Stack spacing={GAP}>
            <Box sx={{ display: 'grid', gap: GAP, gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' } }}>
              <StatCard label="My open tasks" value={stats.mine} icon={ClipboardList} tone="blue" />
              <StatCard label="Due today" value={stats.dueToday} icon={Clock3} tone="violet" />
              <StatCard
                label="Overdue"
                value={stats.overdue}
                helperText={stats.overdue > 0 ? 'Needs attention' : 'All on track'}
                icon={stats.overdue ? TriangleAlert : CircleCheck}
                tone={stats.overdue > 0 ? 'rose' : 'teal'}
                emphasis={stats.overdue > 0}
              />
              <StatCard
                label="Points completed"
                value={stats.completedPoints}
                helperText={`of ${board.data?.totalPoints ?? 0} planned`}
                icon={CircleCheck}
                tone="teal"
                progress={board.data?.totalPoints ? (stats.completedPoints / board.data.totalPoints) * 100 : 0}
              />
            </Box>

            <Box sx={{ display: 'grid', gap: GAP, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))', lg: 'minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr)' } }}>
              <SectionCard
                title="Tasks by status"
                description="Everything on the board right now"
                accent="blue"
                sx={{ gridColumn: { md: '1 / -1', lg: 'auto' } }}
              >
                <ColumnChart
                  ariaLabel="Tasks by status"
                  seriesLabel="Tasks"
                  monochrome={false}
                  data={(board.data?.columns ?? []).map((column) => ({ label: column.name, value: column.taskCount, tone: column.tone }))}
                />
              </SectionCard>

              <SectionCard title="Work by client" description="Open tasks by who they are for" accent="violet">
                {mine?.byClient?.length ? (
                  <DonutChart
                    ariaLabel="Open tasks by client"
                    centerLabel="open"
                    centerValue={mine.open}
                    data={mine.byClient.map((client) => ({ label: client.name, value: client.open, tone: client.tone }))}
                  />
                ) : (
                  <Typography variant="caption">No client work yet.</Typography>
                )}
              </SectionCard>

              <SectionCard title="Team completion" description="Completed share of assigned work" accent="teal">
                {mine?.byTeam?.length ? (
                  <ProgressRows
                    ariaLabel="Completion rate per team"
                    rows={mine.byTeam.map((team) => ({
                      label: team.name,
                      hint: `${team.completed}/${team.assigned} done`,
                      percent: team.assigned ? Math.round((team.completed / team.assigned) * 100) : 0,
                    }))}
                  />
                ) : (
                  <Typography variant="caption">No teams yet.</Typography>
                )}
              </SectionCard>
            </Box>

            {mine ? (
              <Box sx={{ display: 'grid', gap: GAP, gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) minmax(0, 1.7fr)' } }}>
                <WorkspaceSummaryCard workspace={mine} compact />

                <TeamsTable
                  teams={mine.byTeam}
                  title="Teams"
                  description={`${mine.byTeam.length} teams in ${mine.name} · corrections and overdue highlighted`}
                />
              </Box>
            ) : null}

            <Box sx={{ display: 'grid', gap: GAP, gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) minmax(0, 1.6fr)' } }}>
              <SectionCard
                title="My tasks"
                description="Assigned to you, soonest first"
                accent="blue"
                padded={false}
                action={
                  <Button component={Link} to={workspaceViewPath('list')} size="small" endIcon={<ArrowRight size={14} strokeWidth={2} />}>
                    View all
                  </Button>
                }
              >
                {stats.myTasks.length === 0 ? (
                  <EmptyState title="Nothing assigned to you" description="Enjoy the quiet, or pick something off the board." />
                ) : (
                  stats.myTasks.map((task) => (
                    <Stack
                      key={task.id}
                      direction="row"
                      spacing={1.5}
                      sx={{ alignItems: 'center', px: 1.75, py: 1, borderBottom: `1px solid ${colors.border}`, '&:last-of-type': { borderBottom: 0 } }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {task.title}
                        </Typography>
                        <Stack direction="row" spacing={0.75} sx={{ mt: 0.375, flexWrap: 'wrap' }} useFlexGap>
                          <ToneChip label={task.clientName} tone={task.clientTone} />
                          <StatusChip label={task.statusName} tone={task.statusTone} size="small" />
                          <ToneChip label={`${task.points} pts`} tone="teal" />
                        </Stack>
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{ flexShrink: 0, color: task.isOverdue ? STATUS_TONES.rose.strong : colors.textSecondary, fontWeight: task.isOverdue ? 600 : 400 }}
                      >
                        {formatRelativeDay(task.dueDate)}
                      </Typography>
                    </Stack>
                  ))
                )}
              </SectionCard>

              <Stack spacing={GAP} sx={{ minWidth: 0 }}>
                {can(PERMISSIONS.TICKET_VIEW) ? <ClientDeskSummaryCard workspaceId={activeWorkspaceId} /> : null}
                <RecentActivityTable workspaceId={activeWorkspaceId} range={yearRange} canView={can(PERMISSIONS.ACTIVITY_VIEW) && isEnabled(FEATURES.ACTIVITY_LOG)} />
              </Stack>
            </Box>
          </Stack>
        )}
      </QueryStateView>
    </Box>
  )
}
