import { Box, Button, Stack, Typography } from '@mui/material'
import { Building2, CircleCheck, ClipboardList, RefreshCcw, TriangleAlert, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { SectionCard } from '@/components/SectionCard'
import { StatCard } from '@/components/StatCard'
import { EmptyState } from '@/components/EmptyState'
import { QueryStateView } from '@/components/QueryStateView'
import { DashboardSkeleton } from '@/components/Skeletons'
import { ColumnChart, DonutChart, ProgressRows } from '@/components/charts/BarChart'
import { dashboardService } from '@/api/dashboardService'
import { PERMISSIONS } from '@/constants/permissions'
import { ROUTES, workspaceViewPath } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { usePermissions } from '@/hooks/usePermissions'
import { useSession } from '@/hooks/useSession'
import { useWorkspace } from '@/hooks/useWorkspace'
import { formatLongDate, toIsoDate } from '@/utils/date'
import { RecentActivityTable } from './RecentActivityTable'
import { TeamsTable } from './TeamsTable'
import { WorkspaceSummaryCard } from './WorkspaceSummaryCard'

const STATUS_ORDER = ['scheduled', 'todo', 'processing', 'review', 'correction', 'completed']
const GAP = 1.5

export const MasterAdminDashboard = () => {
  const navigate = useNavigate()
  const { user } = useSession()
  const { can } = usePermissions()
  const { activeWorkspaceId, selectWorkspace } = useWorkspace()

  const overview = useAsync(dashboardService.getOverview, [])
  const totals = overview.data?.totals
  const workspaces = overview.data?.workspaces ?? []

  const openBoard = async (workspaceId) => {
    if (workspaceId !== activeWorkspaceId) await selectWorkspace(workspaceId)
    navigate(workspaceViewPath('board'))
  }

  // Organisation-wide status mix, merged across workspaces by column kind.
  const statusMix = STATUS_ORDER.map((kind) => {
    const columns = workspaces.flatMap((workspace) => workspace.byStatus.filter((column) => column.kind === kind))
    return columns.length
      ? { label: columns[0].name, value: columns.reduce((sum, column) => sum + column.count, 0), tone: columns[0].tone }
      : null
  }).filter(Boolean)

  const allTeams = workspaces
    .flatMap((workspace) =>
      workspace.byTeam.map((team) => ({
        ...team,
        workspaceId: workspace.id,
        workspaceShortName: workspace.shortName,
        workspaceTone: workspace.tone,
      })),
    )
    .sort((a, b) => b.assigned - a.assigned || b.correctionMoves - a.correctionMoves)

  const completionRate = totals?.tasks ? Math.round((totals.completed / totals.tasks) * 100) : 0
  const unassignedPeople = Math.max(0, (totals?.employees ?? 0) - (totals?.assigned ?? 0))

  const completionRows = workspaces
    .flatMap((workspace) =>
      workspace.byTeam.map((team) => ({
        label: team.name,
        hint: workspace.shortName,
        percent: team.assigned ? Math.round((team.completed / team.assigned) * 100) : 0,
      })),
    )
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 7)

  return (
    <Box>
      <PageHeader
        title={`Good day, ${user?.name?.split(' ')[0] ?? 'there'}`}
        description={`${formatLongDate(toIsoDate(new Date()))} · Every workspace in the organisation, side by side.`}
        actions={
          can(PERMISSIONS.WORKSPACE_CREATE) ? (
            <Button component={Link} to={ROUTES.adminWorkspaces} variant="outlined" size="small">
              Manage workspaces
            </Button>
          ) : null
        }
      />

      <QueryStateView error={overview.error} onRetry={overview.reload}>
        {overview.loading && !overview.data ? (
          <DashboardSkeleton tiles={6} />
        ) : workspaces.length === 0 ? (
          <EmptyState icon={Building2} title="No workspaces yet" description="Create one under Administration → Workspaces." />
        ) : (
          <Stack spacing={GAP}>
            <Box sx={{ display: 'grid', gap: GAP, gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', xl: 'repeat(6, 1fr)' } }}>
              <StatCard label="Workspaces" value={totals.workspaces} icon={Building2} tone="blue" helperText={`${workspaces.reduce((sum, workspace) => sum + workspace.groups, 0)} groups · ${allTeams.length} teams`} />
              <StatCard
                label="Employees"
                value={totals.employees}
                icon={Users}
                tone="violet"
                helperText={
                  unassignedPeople > 0
                    ? `${totals.assigned} in workspaces · ${unassignedPeople} not yet assigned`
                    : `${totals.assigned} in workspaces · everyone placed`
                }
                progress={totals.employees ? Math.round((totals.assigned / totals.employees) * 100) : 0}
              />
              <StatCard label="Open tasks" value={totals.open} icon={ClipboardList} tone="teal" helperText={`${totals.tasks} in total`} />
              <StatCard
                label="Completed"
                value={`${completionRate}%`}
                icon={CircleCheck}
                tone="green"
                helperText={`${totals.completed} of ${totals.tasks} tasks`}
                progress={completionRate}
              />
              <StatCard
                label="In correction"
                value={totals.inCorrection}
                icon={RefreshCcw}
                tone={totals.inCorrection ? 'rose' : 'teal'}
                emphasis={Boolean(totals.inCorrection)}
                helperText={`${totals.correctionMoves} rework moves overall`}
              />
              <StatCard
                label="Overdue"
                value={totals.overdue}
                icon={totals.overdue ? TriangleAlert : CircleCheck}
                tone={totals.overdue ? 'amber' : 'teal'}
                emphasis={Boolean(totals.overdue)}
                helperText={totals.overdue ? 'Needs attention' : 'All on track'}
              />
            </Box>

            <Box sx={{ display: 'grid', gap: GAP, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: '1.6fr 1fr 1fr' } }}>
              <SectionCard
                title="Open work by workspace"
                description="Open tasks, with the average marked"
                accent="blue"
                sx={{ gridColumn: { md: '1 / -1', lg: 'auto' } }}
              >
                <ColumnChart
                  ariaLabel="Open tasks per workspace"
                  seriesLabel="Open tasks"
                  data={workspaces.map((workspace) => ({ label: workspace.name, value: workspace.open, tone: workspace.tone }))}
                />
              </SectionCard>

              <SectionCard title="Work by status" description="Across the organisation" accent="violet">
                <DonutChart ariaLabel="All tasks by status" data={statusMix} centerLabel="tasks" />
              </SectionCard>

              <SectionCard title="Team completion" description="Completed share of assigned work" accent="teal">
                {completionRows.length === 0 ? (
                  <Typography variant="caption">No teams yet.</Typography>
                ) : (
                  <ProgressRows ariaLabel="Completion rate per team" rows={completionRows} />
                )}
              </SectionCard>
            </Box>

            <Box sx={{ display: 'grid', gap: GAP, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xxl: 'repeat(3, 1fr)' } }}>
              {workspaces.map((workspace) => (
                <WorkspaceSummaryCard key={workspace.id} workspace={workspace} compact onOpen={openBoard} />
              ))}
            </Box>

            <Box sx={{ display: 'grid', gap: GAP, gridTemplateColumns: { xs: '1fr', xl: '1.7fr 1fr' } }}>
              <TeamsTable
                teams={allTeams}
                showWorkspace
                title="Teams"
                description="Every team across the organisation · corrections and overdue highlighted"
              />

              <RecentActivityTable workspaceId={activeWorkspaceId} canView={can(PERMISSIONS.ACTIVITY_VIEW)} />
            </Box>
          </Stack>
        )}
      </QueryStateView>
    </Box>
  )
}
