import { useMemo, useState } from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'
import { Building2, CircleCheck, ClipboardList, Info, RefreshCcw, TriangleAlert, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { SectionCard } from '@/components/SectionCard'
import { StatCard } from '@/components/StatCard'
import { EmptyState } from '@/components/EmptyState'
import { QueryStateView } from '@/components/QueryStateView'
import { DashboardSkeleton } from '@/components/Skeletons'
import { ColumnChart, DonutChart, ProgressRows } from '@/components/charts/BarChart'
import { dashboardService } from '@/api/dashboardService'
import { taskService } from '@/api/taskService'
import { PERMISSIONS } from '@/constants/permissions'
import { ROUTES, filteredViewPath } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { usePermissions } from '@/hooks/usePermissions'
import { useSession } from '@/hooks/useSession'
import { usePeriod } from '@/hooks/usePeriod'
import { useWorkspace } from '@/hooks/useWorkspace'
import { ScopeDetailsDrawer } from '@/features/workspace/components/ScopeDetailsDrawer'
import { TaskDetailDrawer } from '@/features/workspace/components/TaskDetailDrawer'
import { colors } from '@/theme/tokens'
import { formatLongDate, toIsoDate } from '@/utils/date'
import { DailyTrackerCard } from './DailyTrackerCard'
import { PeopleWorkloadCard } from './PeopleWorkloadCard'
import { PersonFocusDrawer } from './PersonFocusDrawer'
import { RecentActivityTable } from './RecentActivityTable'
import { TaskFocusDrawer } from './TaskFocusDrawer'
import { TeamsTable } from './TeamsTable'
import { ClientDeskSummaryCard } from './ClientDeskSummaryCard'
import { WorkspaceSummaryCard } from './WorkspaceSummaryCard'

const STATUS_ORDER = ['scheduled', 'todo', 'processing', 'review', 'correction', 'completed']
const GAP = 1.5

const isOpen = (task) => task.statusKind !== 'completed'

const FOCUSES = {
  open: {
    key: 'open',
    label: 'Open tasks',
    description: 'Everything still to finish',
    tone: 'teal',
    filters: {},
    match: isOpen,
    board: { tab: 'all' },
  },
  overdue: {
    key: 'overdue',
    label: 'Overdue tasks',
    description: 'Past the due date and still open',
    tone: 'amber',
    filters: { tab: 'overdue' },
    match: isOpen,
    board: { tab: 'overdue' },
  },
  dueToday: {
    key: 'dueToday',
    label: 'Due today',
    description: 'Finish these first',
    tone: 'violet',
    filters: { tab: 'today' },
    match: isOpen,
    board: { tab: 'today' },
  },
  correction: {
    key: 'correction',
    label: 'In correction',
    description: 'Sent back for changes',
    tone: 'rose',
    filters: {},
    match: (task) => task.statusKind === 'correction',
    board: { tab: 'all' },
  },
  completed: {
    key: 'completed',
    label: 'Completed work',
    description: 'Finished in this period',
    tone: 'green',
    filters: {},
    match: (task) => task.statusKind === 'completed',
    board: { tab: 'all' },
  },
}

const ClickableTile = ({ onClick, label, children }) => (
  <Box
    component="button"
    type="button"
    onClick={onClick}
    aria-label={label}
    sx={{
      display: 'block',
      width: '100%',
      height: '100%',
      p: 0,
      m: 0,
      border: 0,
      bgcolor: 'transparent',
      font: 'inherit',
      textAlign: 'left',
      cursor: 'pointer',
      borderRadius: 2.5,
      transition: 'transform 140ms ease',
      '&:hover': { transform: 'translateY(-1px)' },
      '&:focus-visible': { outline: 'none', boxShadow: `0 0 0 2px ${colors.surface}, 0 0 0 4px ${colors.brand}` },
    }}
  >
    {children}
  </Box>
)

export const MasterAdminDashboard = () => {
  const navigate = useNavigate()
  const { user } = useSession()
  const { can } = usePermissions()
  const { activeWorkspaceId, selectWorkspace } = useWorkspace()
  const { yearRange, yearLabel, periodLabel } = usePeriod()

  const [focus, setFocus] = useState(null)
  const [person, setPerson] = useState(null)
  const [detailsFor, setDetailsFor] = useState(null)
  const [openTask, setOpenTask] = useState(null)
  const [peopleFor, setPeopleFor] = useState(null)

  const overview = useAsync(dashboardService.getOverview, [yearRange])
  const totals = overview.data?.totals
  const workspaces = useMemo(() => overview.data?.workspaces ?? [], [overview.data])

  const peopleWorkspace =
    workspaces.find((workspace) => workspace.id === (peopleFor ?? activeWorkspaceId)) ?? workspaces[0] ?? null

  const goToWorkspace = async (workspaceId, path) => {
    if (workspaceId && workspaceId !== activeWorkspaceId) await selectWorkspace(workspaceId)
    navigate(path)
  }

  const openBoardFor = (workspaceId, filters = {}) =>
    goToWorkspace(workspaceId, filteredViewPath({}, 'board', filters))

  const openTaskFromList = async (task) => {
    if (task.workspaceId !== activeWorkspaceId) {
      await openBoardFor(task.workspaceId, { search: task.title })
      return
    }
    setFocus(null)
    setPerson(null)
    setOpenTask(task)
  }

  const refreshAll = () => {
    overview.reload()
    if (openTask) {
      taskService
        .getTask(openTask.id)
        .then(setOpenTask)
        .catch(() => setOpenTask(null))
    }
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
  const dueToday = workspaces.reduce((sum, workspace) => sum + (workspace.dueToday ?? 0), 0)

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
        description={`${formatLongDate(toIsoDate(new Date()))} · FY ${yearLabel} · Every workspace in the organisation, side by side.`}
        actions={
          <>
            {peopleWorkspace ? (
              <Button
                variant="outlined"
                startIcon={<Info size={15} strokeWidth={2} />}
                onClick={() => setDetailsFor(peopleWorkspace.id)}
              >
                Workspace details
              </Button>
            ) : null}
            {can(PERMISSIONS.WORKSPACE_CREATE) ? (
              <Button component={Link} to={ROUTES.adminWorkspaces} variant="outlined" size="small">
                Manage workspaces
              </Button>
            ) : null}
          </>
        }
      />

      <QueryStateView error={overview.error} onRetry={overview.reload}>
        {overview.loading && !overview.data ? (
          <DashboardSkeleton tiles={6} />
        ) : workspaces.length === 0 ? (
          <EmptyState icon={Building2} title="No workspaces yet" description="Create one under Administration → Workspaces." />
        ) : (
          <Stack spacing={GAP}>
            <Box sx={{ display: 'grid', gap: GAP, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))', xl: 'repeat(6, minmax(0, 1fr))' } }}>
              <ClickableTile label="Manage workspaces" onClick={() => navigate(ROUTES.adminWorkspaces)}>
                <StatCard
                  label="Workspaces"
                  value={totals.workspaces}
                  icon={Building2}
                  tone="blue"
                  helperText={`${workspaces.reduce((sum, workspace) => sum + workspace.groups, 0)} groups · ${allTeams.length} teams`}
                />
              </ClickableTile>

              <ClickableTile label="Open the employee directory" onClick={() => navigate(ROUTES.employees)}>
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
              </ClickableTile>

              <ClickableTile label="See every open task" onClick={() => setFocus(FOCUSES.open)}>
                <StatCard
                  label="Open tasks"
                  value={totals.open}
                  icon={ClipboardList}
                  tone="teal"
                  helperText={dueToday ? `${totals.tasks} in total · ${dueToday} due today` : `${totals.tasks} in total`}
                />
              </ClickableTile>

              <ClickableTile label="See completed work" onClick={() => setFocus(FOCUSES.completed)}>
                <StatCard
                  label="Completed"
                  value={`${completionRate}%`}
                  icon={CircleCheck}
                  tone="green"
                  helperText={`${totals.completed} of ${totals.tasks} tasks`}
                  progress={completionRate}
                />
              </ClickableTile>

              <ClickableTile label="See tasks in correction" onClick={() => setFocus(FOCUSES.correction)}>
                <StatCard
                  label="In correction"
                  value={totals.inCorrection}
                  icon={RefreshCcw}
                  tone={totals.inCorrection ? 'rose' : 'teal'}
                  emphasis={Boolean(totals.inCorrection)}
                  helperText={`${totals.correctionMoves} rework moves overall`}
                />
              </ClickableTile>

              <ClickableTile label="See overdue tasks and who holds them" onClick={() => setFocus(FOCUSES.overdue)}>
                <StatCard
                  label="Overdue"
                  value={totals.overdue}
                  icon={totals.overdue ? TriangleAlert : CircleCheck}
                  tone={totals.overdue ? 'amber' : 'teal'}
                  emphasis={Boolean(totals.overdue)}
                  helperText={totals.overdue ? 'Tap to see who and which team' : 'All on track'}
                />
              </ClickableTile>
            </Box>

            <Box sx={{ display: 'grid', gap: GAP, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))', lg: 'minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr)' } }}>
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

            {peopleWorkspace ? (
              <Box>
                {workspaces.length > 1 ? (
                  <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', mb: 1 }}>
                    <Typography variant="caption" sx={{ alignSelf: 'center', color: colors.textSecondary, mr: 0.5 }}>
                      People and details for
                    </Typography>
                    {workspaces.map((workspace) => {
                      const selected = workspace.id === peopleWorkspace.id
                      return (
                        <Box
                          key={workspace.id}
                          component="button"
                          type="button"
                          onClick={() => setPeopleFor(workspace.id)}
                          aria-pressed={selected}
                          sx={{
                            height: 28,
                            px: 1.25,
                            border: `1px solid ${selected ? colors.brand : colors.border}`,
                            borderRadius: 999,
                            bgcolor: selected ? colors.brand : colors.surface,
                            color: selected ? '#FFFFFF' : colors.textPrimary,
                            font: 'inherit',
                            fontSize: '0.75rem',
                            fontWeight: selected ? 650 : 500,
                            cursor: 'pointer',
                          }}
                        >
                          {workspace.name}
                        </Box>
                      )
                    })}
                  </Stack>
                ) : null}

                <PeopleWorkloadCard
                  workspaceId={peopleWorkspace.id}
                  workspaceName={peopleWorkspace.name}
                  range={yearRange}
                  periodLabel={`FY ${yearLabel}`}
                  onSelectPerson={(selected) => setPerson({ ...selected, workspace: peopleWorkspace })}
                />

                <Box sx={{ mt: GAP }}>
                  <DailyTrackerCard workspaceId={peopleWorkspace.id} workspaceName={peopleWorkspace.name} />
                </Box>
              </Box>
            ) : null}

            <Box sx={{ display: 'grid', gap: GAP, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))', xxl: 'repeat(3, minmax(0, 1fr))' } }}>
              {workspaces.map((workspace) => (
                <WorkspaceSummaryCard
                  key={workspace.id}
                  workspace={workspace}
                  compact
                  onOpen={(id) => openBoardFor(id)}
                  onDetails={(id) => setDetailsFor(id)}
                />
              ))}
            </Box>

            <Box sx={{ display: 'grid', gap: GAP, gridTemplateColumns: { xs: 'minmax(0, 1fr)', xl: 'minmax(0, 1.7fr) minmax(0, 1fr)' } }}>
              <TeamsTable
                teams={allTeams}
                showWorkspace
                title="Teams"
                description="Every team across the organisation · corrections and overdue highlighted"
                onSelectTeam={(team) =>
                  goToWorkspace(team.workspaceId, filteredViewPath({ groupId: team.groupId, teamId: team.id }, 'board'))
                }
              />

              <Stack spacing={GAP} sx={{ minWidth: 0 }}>
                {can(PERMISSIONS.TICKET_VIEW) && peopleWorkspace ? (
                  <ClientDeskSummaryCard workspaceId={peopleWorkspace.id} />
                ) : null}
                <RecentActivityTable range={yearRange} canView={can(PERMISSIONS.ACTIVITY_VIEW)} />
              </Stack>
            </Box>
          </Stack>
        )}
      </QueryStateView>

      {focus ? (
        <TaskFocusDrawer
          focus={focus}
          workspaces={workspaces}
          range={yearRange}
          periodLabel={periodLabel}
          onClose={() => setFocus(null)}
          onOpenTask={openTaskFromList}
          onOpenBoard={(current) => {
            setFocus(null)
            openBoardFor(peopleWorkspace?.id, current.board ?? {})
          }}
        />
      ) : null}

      {person ? (
        <PersonFocusDrawer
          person={person}
          workspaceId={person.workspace.id}
          workspaceName={person.workspace.name}
          range={yearRange}
          periodLabel={`FY ${yearLabel}`}
          onClose={() => setPerson(null)}
          onOpenTask={openTaskFromList}
          onOpenBoard={(selected) => {
            setPerson(null)
            openBoardFor(person.workspace.id, { assigneeId: selected.id })
          }}
        />
      ) : null}

      {detailsFor ? (
        <ScopeDetailsDrawer
          key={detailsFor}
          workspaceId={detailsFor}
          scope={{ groupId: '', teamId: '' }}
          onClose={() => setDetailsFor(null)}
          onOpenBoard={(target) => {
            const workspaceId = detailsFor
            setDetailsFor(null)
            goToWorkspace(workspaceId, filteredViewPath(target, 'board'))
          }}
        />
      ) : null}

      {openTask ? (
        <TaskDetailDrawer
          task={openTask}
          onClose={() => setOpenTask(null)}
          onChanged={refreshAll}
          onEdit={(task) => {
            setOpenTask(null)
            openBoardFor(task.workspaceId, { search: task.title })
          }}
        />
      ) : null}
    </Box>
  )
}
