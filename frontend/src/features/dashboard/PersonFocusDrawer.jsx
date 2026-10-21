import { useMemo } from 'react'
import { Box, Button, Drawer, IconButton, Stack, Typography } from '@mui/material'
import { ArrowRight, ChevronRight, X } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { MetricTile } from '@/components/MetricTile'
import { QueryStateView } from '@/components/QueryStateView'
import { ListSectionSkeleton } from '@/components/Skeletons'
import { StatusChip } from '@/components/StatusChip'
import { ToneChip } from '@/components/ToneChip'
import { UserAvatar } from '@/components/UserAvatar'
import { dashboardService } from '@/api/dashboardService'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { useAsync } from '@/hooks/useAsync'
import { colors } from '@/theme/tokens'
import { daysUntil, formatDate } from '@/utils/date'

const localDay = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const dueText = (task) => {
  const diff = daysUntil(task.dueDate)
  if (diff === null) return 'No due date'
  if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} late`
  if (diff === 0) return 'Due today'
  if (diff === 1) return 'Tomorrow'
  return `In ${diff} days`
}

const TaskLine = ({ task, tone, onOpen }) => (
  <Box
    role="button"
    tabIndex={0}
    onClick={() => onOpen(task)}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onOpen(task)
      }
    }}
    aria-label={`Open ${task.title}`}
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      px: 1.75,
      py: 1,
      cursor: 'pointer',
      borderBottom: `1px solid ${colors.border}`,
      '&:last-of-type': { borderBottom: 0 },
      '&:hover': { bgcolor: colors.page },
      '&:focus-visible': { outline: 'none', boxShadow: `inset 0 0 0 2px ${colors.brand}` },
    }}
  >
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
        {task.title}
      </Typography>
      <Stack direction="row" spacing={0.75} useFlexGap sx={{ mt: 0.375, alignItems: 'center', flexWrap: 'wrap' }}>
        <StatusChip label={task.statusName} tone={task.statusTone} size="small" />
        {task.clientName && task.clientName !== '—' ? <ToneChip label={task.clientName} tone={task.clientTone} /> : null}
        <Typography variant="caption" noWrap>
          {[task.groupName, task.teamName].filter((name) => name && name !== '—').join(' · ')}
        </Typography>
      </Stack>
    </Box>
    <Stack spacing={0.25} sx={{ alignItems: 'flex-end', flexShrink: 0 }}>
      <Typography variant="caption" sx={{ color: tone.strong, fontWeight: 700, whiteSpace: 'nowrap' }}>
        {dueText(task)}
      </Typography>
      <Typography variant="caption" sx={{ color: colors.textSecondary }}>
        {task.points} pts
      </Typography>
    </Stack>
    <ChevronRight size={15} strokeWidth={2} color={colors.textSecondary} aria-hidden="true" />
  </Box>
)

const Group = ({ title, tone, tasks, onOpenTask }) =>
  tasks.length === 0 ? null : (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          px: 1.75,
          py: 0.75,
          bgcolor: colors.page,
          borderTop: `1px solid ${colors.border}`,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: STATUS_TONES[tone].strong }} />
        <Typography
          component="span"
          sx={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: STATUS_TONES[tone].strong,
          }}
        >
          {title}
        </Typography>
        <Typography variant="caption" sx={{ color: colors.textSecondary }}>
          {tasks.length}
        </Typography>
      </Stack>
      {tasks.map((task) => (
        <TaskLine key={task.id} task={task} tone={STATUS_TONES[tone]} onOpen={onOpenTask} />
      ))}
    </Box>
  )

export const PersonFocusDrawer = ({
  person,
  workspaceId,
  workspaceName,
  range,
  periodLabel,
  onClose,
  onOpenTask,
  onOpenBoard,
}) => {
  const workspaceIds = useMemo(() => [workspaceId], [workspaceId])
  const filters = useMemo(() => ({ assigneeId: person.id, ...range }), [person.id, range])

  const query = useAsync(dashboardService.collectTasks, [workspaceIds, filters], {
    enabled: Boolean(workspaceId),
  })

  const groups = useMemo(() => {
    const tasks = query.data ?? []
    const today = localDay()
    const open = tasks.filter((task) => task.statusKind !== 'completed')
    const completed = tasks
      .filter((task) => task.statusKind === 'completed')
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))

    return {
      overdue: open.filter((task) => task.isOverdue),
      dueToday: open.filter((task) => !task.isOverdue && task.dueDate === today),
      correction: open.filter((task) => task.statusKind === 'correction' && !task.isOverdue && task.dueDate !== today),
      later: open.filter(
        (task) => !task.isOverdue && task.dueDate !== today && task.statusKind !== 'correction',
      ),
      completed,
      points: completed.reduce((sum, task) => sum + task.points, 0),
      open,
    }
  }, [query.data])

  return (
    <Drawer
      anchor="right"
      open
      onClose={onClose}
      aria-label={`${person.fullName} details`}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 560 } } } }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ alignItems: 'center', px: 2, py: 1.75, borderBottom: `1px solid ${colors.border}`, bgcolor: colors.page }}
      >
        <UserAvatar name={person.fullName} size={42} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h3" component="h2" noWrap>
            {person.fullName}
          </Typography>
          <Typography variant="caption" component="p" noWrap>
            {[person.designation, person.teamName, workspaceName].filter((item) => item && item !== '—').join(' · ')}
          </Typography>
        </Box>
        {person.role ? <ToneChip label={person.role} tone="violet" /> : null}
        <IconButton size="small" aria-label="Close" onClick={onClose}>
          <X size={16} strokeWidth={1.75} />
        </IconButton>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <QueryStateView error={query.error} onRetry={query.reload}>
          {query.loading && !query.data ? (
            <Box sx={{ p: 2 }}>
              <ListSectionSkeleton rows={5} />
            </Box>
          ) : (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 1, p: 1.75 }}>
                <MetricTile label="Open" value={groups.open.length} tone="blue" />
                <MetricTile label="Overdue" value={groups.overdue.length} tone="rose" warn />
                <MetricTile label="Done" value={groups.completed.length} tone="green" />
                <MetricTile label="Points" value={groups.points} tone="teal" />
              </Box>

              {query.data?.length === 0 ? (
                <EmptyState
                  title="No tasks in this period"
                  description={`${person.fullName} has nothing assigned in ${periodLabel}.`}
                />
              ) : (
                <>
                  <Group title="Overdue" tone="rose" tasks={groups.overdue} onOpenTask={onOpenTask} />
                  <Group title="Due today" tone="amber" tasks={groups.dueToday} onOpenTask={onOpenTask} />
                  <Group title="In correction" tone="orange" tasks={groups.correction} onOpenTask={onOpenTask} />
                  <Group title="Coming up" tone="blue" tasks={groups.later} onOpenTask={onOpenTask} />
                  <Group title={`Completed in ${periodLabel}`} tone="green" tasks={groups.completed.slice(0, 10)} onOpenTask={onOpenTask} />
                  {groups.completed.length > 10 ? (
                    <Typography variant="caption" component="p" sx={{ px: 1.75, py: 1, color: colors.textSecondary }}>
                      +{groups.completed.length - 10} more completed · last on {formatDate(groups.completed[0].completedAt)}
                    </Typography>
                  ) : null}
                </>
              )}
            </>
          )}
        </QueryStateView>
      </Box>

      <Stack
        direction="row"
        spacing={1}
        sx={{ px: 2, py: 1.5, borderTop: `1px solid ${colors.border}`, justifyContent: 'flex-end' }}
      >
        <Button variant="outlined" onClick={onClose}>
          Close
        </Button>
        <Button variant="contained" onClick={() => onOpenBoard(person)} endIcon={<ArrowRight size={14} strokeWidth={2} />}>
          Open their board
        </Button>
      </Stack>
    </Drawer>
  )
}
