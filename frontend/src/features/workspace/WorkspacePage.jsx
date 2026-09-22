import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  ButtonGroup,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import { ChevronDown, Columns3, Info, LayoutList, Plus, Repeat, Settings2, Table2 } from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { MonthPicker } from '@/components/MonthPicker'
import { QueryStateView } from '@/components/QueryStateView'
import { EmptyState } from '@/components/EmptyState'
import { ToneChip } from '@/components/ToneChip'
import { taskService } from '@/api/taskService'
import { dashboardService } from '@/api/dashboardService'
import { PERMISSIONS } from '@/constants/permissions'
import { FEATURES } from '@/constants/features'
import { DEFAULT_VIEW, ROUTES, viewPathFor, workspaceViewPath } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useFeatures } from '@/hooks/useFeatures'
import { usePermissions } from '@/hooks/usePermissions'
import { usePeriod } from '@/hooks/usePeriod'
import { useWorkspace } from '@/hooks/useWorkspace'
import { useAccess } from '@/hooks/useAccess'
import { colors, layout } from '@/theme/tokens'
import { TaskFilterBar } from './components/TaskFilterBar'
import { TaskFormDialog } from './components/TaskFormDialog'
import { AddGroupDialog } from './components/AddGroupDialog'
import { RemoveGroupDialog } from './components/RemoveGroupDialog'
import { TaskDetailDrawer } from './components/TaskDetailDrawer'
import { ScopeDetailsDrawer } from './components/ScopeDetailsDrawer'
import { ScopeStats } from './components/ScopeStats'
import { RecurringTaskDialog } from './components/RecurringTaskDialog'
import { BoardView } from './views/BoardView'
import { ListView } from './views/ListView'
import { TableView } from './views/TableView'

const EMPTY_FILTERS = {
  tab: 'all',
  search: '',
  clientId: '',
  groupId: '',
  teamId: '',
  assigneeId: '',
  priority: '',
  sizeKey: '',
}

const VIEW_TABS = [
  { value: 'board', label: 'Board', icon: Columns3, feature: FEATURES.BOARD_VIEW },
  { value: 'list', label: 'List', icon: LayoutList, feature: FEATURES.LIST_VIEW },
  { value: 'table', label: 'Table', icon: Table2, feature: FEATURES.TABLE_VIEW },
]

export const WorkspacePage = () => {
  const navigate = useNavigate()
  const params = useParams()
  const { can } = usePermissions()
  const { canCreateAnywhere } = useAccess()
  const { isEnabled } = useFeatures()
  const { activeWorkspace, activeWorkspaceId, groups, teams, refreshStructure } = useWorkspace()

  const scope = useMemo(
    () => ({ groupId: params.groupId ?? '', teamId: params.teamId ?? '' }),
    [params.groupId, params.teamId],
  )

  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [taskDialog, setTaskDialog] = useState({ open: false, task: null, statusId: null })
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [removingGroup, setRemovingGroup] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [addMenu, setAddMenu] = useState(null)
  const [recurringOpen, setRecurringOpen] = useState(false)

  const availableTabs = VIEW_TABS.filter((tab) => isEnabled(tab.feature))
  const view = availableTabs.some((tab) => tab.value === params.view) ? params.view : null

  const debouncedSearch = useDebouncedValue(filters.search, 300)
  const { range } = usePeriod()

  // The route owns group/team scope, so it always wins over the filter bar.
  const query = useMemo(
    () => ({
      ...filters,
      search: debouncedSearch,
      groupId: scope.groupId,
      teamId: scope.teamId,
      from: range.from,
      to: range.to,
    }),
    [filters, debouncedSearch, scope, range.from, range.to],
  )

  const {
    data: board,
    loading,
    error,
    reload,
    setData: setBoard,
  } = useAsync(taskService.getBoard, [activeWorkspaceId, query], {
    enabled: Boolean(activeWorkspaceId) && Boolean(view),
  })

  const group = groups.find((item) => item.id === scope.groupId) ?? null
  const team = teams.find((item) => item.id === scope.teamId) ?? null

  const canSeeWorkspace = can(PERMISSIONS.WORKSPACE_VIEW)
  const summary = useAsync(dashboardService.getScopeSummary, [activeWorkspaceId, { ...scope, ...range }], {
    enabled: Boolean(activeWorkspaceId) && Boolean(view),
  })

  const refreshAll = () => {
    reload()
    summary.reload()
    if (selectedTask) {
      taskService
        .getTask(selectedTask.id)
        .then(setSelectedTask)
        .catch(() => setSelectedTask(null))
    }
  }

  if (!view) {
    const fallback = availableTabs[0]?.value ?? DEFAULT_VIEW
    return <Navigate to={viewPathFor(scope, fallback)} replace />
  }

  if (!activeWorkspace) {
    return (
      <Box sx={{ maxWidth: layout.contentMaxWidth, mx: 'auto', px: { xs: 2, md: 3, lg: 4 }, py: 4 }}>
        <PageHeader title="Workspace" />
        <EmptyState
          title="No workspace available"
          description="You have not been added to a workspace yet. An administrator can create one and assign you to it."
          actionLabel={can(PERMISSIONS.WORKSPACE_CREATE) ? 'Manage workspaces' : undefined}
          onAction={can(PERMISSIONS.WORKSPACE_CREATE) ? () => navigate(ROUTES.adminWorkspaces) : undefined}
        />
      </Box>
    )
  }

  // A stale or foreign group id in the URL should not render an empty board silently.
  if (scope.groupId && !group) {
    return (
      <Box sx={{ maxWidth: layout.contentMaxWidth, mx: 'auto', px: { xs: 2, md: 3, lg: 4 }, py: 4 }}>
        <PageHeader title="Group not found" breadcrumbs={[{ label: 'Work', to: workspaceViewPath(view) }]} />
        <EmptyState
          title="That group is not in this workspace"
          description="It may have been deleted, or it belongs to a different workspace."
          actionLabel="Back to all work"
          onAction={() => navigate(workspaceViewPath(view))}
        />
      </Box>
    )
  }

  const title = team?.name ?? group?.name ?? activeWorkspace.name
  const description = team
    ? `${group?.name} · ${activeWorkspace.name} · lead ${team.leadName} · ${team.members.length} members`
    : group
      ? `${activeWorkspace.name} · ${group.teams.length} teams · lead ${group.leadName}`
      : activeWorkspace.description
  const detailsLabel = team ? 'Team details' : group ? 'Group details' : 'Workspace details'

  const breadcrumbs = [{ label: 'Work', to: workspaceViewPath(view) }]
  if (group) breadcrumbs.push({ label: group.name, to: viewPathFor({ groupId: group.id }, view) })
  if (team) breadcrumbs.push({ label: team.name })

  return (
    <Box
      sx={{
        maxWidth: layout.wideMaxWidth,
        mx: 'auto',
        px: { xs: 1.5, sm: 2, md: 3, lg: 4 },
        py: { xs: 1.5, md: 2.5 },
      }}
    >
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={breadcrumbs}
        actions={
          <>
            {canSeeWorkspace ? (
              <Button
                variant="outlined"
                startIcon={<Info size={15} strokeWidth={2} />}
                onClick={() => setDetailsOpen(true)}
              >
                {detailsLabel}
              </Button>
            ) : null}
            <MonthPicker hint="Completed tasks show in the month they were finished. Open tasks show in the month they are due — the current month also keeps anything still open from earlier." />
            {can(PERMISSIONS.TASK_CREATE) && canCreateAnywhere ? (
              <ButtonGroup variant="contained" disableElevation aria-label="Add task">
                <Button
                  startIcon={<Plus size={16} strokeWidth={2} />}
                  onClick={() => setTaskDialog({ open: true, task: null, statusId: null })}
                >
                  Add task
                </Button>
                {isEnabled(FEATURES.RECURRING_TASKS) && can(PERMISSIONS.TASK_RECURRING) ? (
                  <Button
                    size="small"
                    aria-label="More ways to add"
                    aria-haspopup="menu"
                    onClick={(event) => setAddMenu(event.currentTarget)}
                    sx={{ px: 0.75, minWidth: 0 }}
                  >
                    <ChevronDown size={15} strokeWidth={2} />
                  </Button>
                ) : null}
              </ButtonGroup>
            ) : null}
          </>
        }
      />

      {group ? (
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', mb: 1.5 }} useFlexGap>
          <ToneChip label={group.name} tone={group.tone} size="medium" />
          {team ? <ToneChip label={`Team · ${team.name}`} tone="teal" size="medium" /> : null}
          {!team && group.teams.length > 0
            ? group.teams.map((item) => (
                <Box
                  key={item.id}
                  component={Link}
                  to={viewPathFor({ groupId: group.id, teamId: item.id }, view)}
                  sx={{ textDecoration: 'none' }}
                >
                  <ToneChip label={item.name} tone="slate" />
                </Box>
              ))
            : null}
        </Stack>
      ) : null}

      <ScopeStats
        summary={summary.data}
        loading={summary.loading && !summary.data}
        showPoints={isEnabled(FEATURES.WEIGHTAGE)}
        personal={!canSeeWorkspace}
      />

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        sx={{ alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between', mb: 1.5 }}
      >
        <Tabs value={view} aria-label="View mode" sx={{ minHeight: 40, borderBottom: 'none' }}>
          {availableTabs.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              component={Link}
              to={viewPathFor(scope, tab.value)}
              icon={<tab.icon size={15} strokeWidth={1.75} />}
              iconPosition="start"
              sx={{ minHeight: 40 }}
            />
          ))}
        </Tabs>

        {board ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <ToneChip label={`${board.totalTasks} tasks`} tone="slate" size="medium" />
            {isEnabled(FEATURES.WEIGHTAGE) ? (
              <ToneChip label={`${board.totalPoints} points`} tone="teal" size="medium" />
            ) : null}
            <Typography variant="caption" sx={{ color: colors.textSecondary, display: { xs: 'none', lg: 'block' } }}>
              in view
            </Typography>
          </Stack>
        ) : null}
      </Stack>

      <TaskFilterBar
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(EMPTY_FILTERS)}
        hideGroup={Boolean(group)}
        hideTeam={Boolean(team)}
        teamScopeGroupId={group?.id}
      />

      <QueryStateView error={error} onRetry={reload}>
        {view === 'board' ? (
          <BoardView
            board={board}
            loading={loading}
            scope={scope}
            onOpenTask={setSelectedTask}
            onAddGroup={() => setGroupDialogOpen(true)}
            onRemoveGroup={setRemovingGroup}
            onChanged={refreshAll}
            onBoardChange={setBoard}
          />
        ) : null}
        {view === 'list' ? (
          <ListView
            board={board}
            loading={loading}
            onOpenTask={setSelectedTask}
            onAddTask={(statusId) => setTaskDialog({ open: true, task: null, statusId })}
            onRemoveGroup={setRemovingGroup}
            onChanged={refreshAll}
          />
        ) : null}
        {view === 'table' ? (
          <TableView board={board} loading={loading} onOpenTask={setSelectedTask} onChanged={refreshAll} />
        ) : null}
      </QueryStateView>

      {taskDialog.open ? (
        <TaskFormDialog
          open
          task={taskDialog.task}
          defaultStatusId={taskDialog.statusId}
          defaultGroupId={scope.groupId}
          defaultTeamId={scope.teamId}
          onClose={() => setTaskDialog({ open: false, task: null, statusId: null })}
          onSaved={refreshAll}
        />
      ) : null}

      {groupDialogOpen ? (
        <AddGroupDialog
          open
          onClose={() => setGroupDialogOpen(false)}
          onSaved={() => {
            refreshStructure()
            reload()
          }}
        />
      ) : null}

      {removingGroup ? (
        <RemoveGroupDialog
          column={removingGroup}
          onClose={() => setRemovingGroup(null)}
          onRemoved={(column) => {
            if (board) setBoard({ ...board, columns: board.columns.filter((item) => item.id !== column.id) })
            refreshStructure()
            reload()
          }}
        />
      ) : null}

      <Menu
        open={Boolean(addMenu)}
        anchorEl={addMenu}
        onClose={() => setAddMenu(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            setAddMenu(null)
            setTaskDialog({ open: true, task: null, statusId: null })
          }}
        >
          <ListItemIcon>
            <Plus size={15} strokeWidth={2} />
          </ListItemIcon>
          <ListItemText primary="New task" secondary="A one-off task on the board" />
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAddMenu(null)
            setRecurringOpen(true)
          }}
        >
          <ListItemIcon>
            <Repeat size={15} strokeWidth={2} />
          </ListItemIcon>
          <ListItemText primary="New recurring task" secondary="Repeats daily, on chosen days or monthly" />
        </MenuItem>
        <MenuItem component={Link} to={ROUTES.recurring} onClick={() => setAddMenu(null)}>
          <ListItemIcon>
            <Settings2 size={15} strokeWidth={2} />
          </ListItemIcon>
          <ListItemText primary="Manage recurring tasks" />
        </MenuItem>
      </Menu>

      {recurringOpen ? (
        <RecurringTaskDialog
          defaultGroupId={scope.groupId}
          defaultTeamId={scope.teamId}
          onClose={() => setRecurringOpen(false)}
        />
      ) : null}

      {detailsOpen && canSeeWorkspace ? (
        <ScopeDetailsDrawer
          key={`${scope.groupId}/${scope.teamId}`}
          workspaceId={activeWorkspaceId}
          scope={scope}
          onClose={() => setDetailsOpen(false)}
          onOpenBoard={(target) => {
            setDetailsOpen(false)
            navigate(viewPathFor(target, view))
          }}
        />
      ) : null}

      {selectedTask ? (
        <TaskDetailDrawer
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onChanged={refreshAll}
          onEdit={(task) => {
            setSelectedTask(null)
            setTaskDialog({ open: true, task, statusId: null })
          }}
        />
      ) : null}
    </Box>
  )
}
