import { useMemo, useState } from 'react'
import {
  Box,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import { ChevronDown, CircleCheck, ClipboardList, Gauge, RefreshCcw, TriangleAlert, X } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { ListSectionSkeleton } from '@/components/Skeletons'
import { QueryStateView } from '@/components/QueryStateView'
import { StatusChip } from '@/components/StatusChip'
import { ToneChip } from '@/components/ToneChip'
import { UserAvatar } from '@/components/UserAvatar'
import { taskService } from '@/api/taskService'
import { PRIORITY_TONES, STATUS_TONES } from '@/constants/workspaceDomain'
import { useAsync } from '@/hooks/useAsync'
import { colors } from '@/theme/tokens'
import { formatDate } from '@/utils/date'
import { pluralize } from '@/utils/format'

const HEAD = {
  fontSize: '0.6875rem',
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: colors.textSecondary,
  bgcolor: colors.page,
  whiteSpace: 'nowrap',
}

const SUMMARY_KINDS = {
  tasks: {
    title: 'All tasks',
    icon: ClipboardList,
    tone: 'blue',
    keep: () => true,
  },
  completed: {
    title: 'Completed tasks',
    icon: CircleCheck,
    tone: 'teal',
    keep: (task) => task.columnKind === 'completed',
  },
  correction: {
    title: 'Tasks in correction',
    icon: RefreshCcw,
    tone: 'rose',
    keep: (task) => task.columnKind === 'correction',
  },
  overdue: {
    title: 'Overdue tasks',
    icon: TriangleAlert,
    tone: 'amber',
    keep: (task) => task.isOverdue,
  },
  points: {
    title: 'Points by person',
    icon: Gauge,
    tone: 'orange',
    keep: () => true,
  },
}

const flatten = (board) =>
  (board?.columns ?? []).flatMap((column) =>
    (column.tasks ?? []).map((task) => ({ ...task, columnKind: column.kind, columnName: column.name, columnTone: column.tone })),
  )

const byPerson = (tasks) => {
  const people = new Map()
  tasks.forEach((task) => {
    const owners = task.assignees?.length ? task.assignees : [{ id: 'unassigned', fullName: 'Unassigned' }]
    owners.forEach((person) => {
      const entry = people.get(person.id) ?? {
        ...person,
        items: [],
        total: 0,
        done: 0,
        correction: 0,
        overdue: 0,
        open: 0,
        points: 0,
        earned: 0,
        teams: new Set(),
        clients: new Set(),
      }
      entry.items.push(task)
      entry.total += 1
      entry.points += task.points ?? 0
      if (task.teamName && task.teamName !== '—') entry.teams.add(task.teamName)
      if (task.clientName && task.clientName !== '—') entry.clients.add(task.clientName)
      if (task.columnKind === 'completed') {
        entry.done += 1
        entry.earned += task.points ?? 0
      } else {
        entry.open += 1
        if (task.columnKind === 'correction') entry.correction += 1
        if (task.isOverdue) entry.overdue += 1
      }
      people.set(person.id, entry)
    })
  })

  return [...people.values()]
    .map((person) => ({
      ...person,
      teams: [...person.teams],
      clients: [...person.clients],
      items: [...person.items].sort(
        (a, b) => (b.points ?? 0) - (a.points ?? 0) || (a.dueDate ?? '').localeCompare(b.dueDate ?? ''),
      ),
    }))
    .sort((a, b) => b.earned - a.earned || b.points - a.points || a.fullName.localeCompare(b.fullName))
}

const totalsOf = (people) =>
  people.reduce(
    (sum, person) => ({
      total: sum.total + person.total,
      done: sum.done + person.done,
      correction: sum.correction + person.correction,
      overdue: sum.overdue + person.overdue,
      points: sum.points + person.points,
      earned: sum.earned + person.earned,
    }),
    { total: 0, done: 0, correction: 0, overdue: 0, points: 0, earned: 0 },
  )

const TaskRows = ({ tasks, onOpen }) => (
  <Table size="small" stickyHeader sx={{ minWidth: 860 }}>
    <TableHead>
      <TableRow>
        <TableCell sx={{ ...HEAD, minWidth: 220 }}>Task</TableCell>
        <TableCell sx={{ ...HEAD, width: 150 }}>Client</TableCell>
        <TableCell sx={{ ...HEAD, width: 140 }}>Status</TableCell>
        <TableCell sx={{ ...HEAD, minWidth: 170 }}>Assigned to</TableCell>
        <TableCell sx={{ ...HEAD, minWidth: 150 }}>Assigned by</TableCell>
        <TableCell sx={{ ...HEAD, width: 120 }}>Due</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {tasks.map((task) => (
        <TableRow key={task.id} hover onClick={() => onOpen(task)} sx={{ cursor: 'pointer' }}>
          <TableCell>
            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.35 }}>
              {task.title}
            </Typography>
            <Stack direction="row" spacing={0.5} useFlexGap sx={{ mt: 0.375, flexWrap: 'wrap', alignItems: 'center' }}>
              <ToneChip label={task.priority} tone={PRIORITY_TONES[task.priority] ?? 'gray'} />
              {task.points ? <ToneChip label={`${task.points} pts`} tone="green" /> : null}
              {task.teamName && task.teamName !== '—' ? (
                <Typography variant="caption" noWrap sx={{ color: colors.textSecondary }}>
                  {task.teamName}
                </Typography>
              ) : null}
            </Stack>
          </TableCell>
          <TableCell>
            {task.clientName ? <ToneChip label={task.clientName} tone={task.clientTone ?? 'slate'} /> : '—'}
          </TableCell>
          <TableCell>
            <StatusChip label={task.columnName} tone={task.columnTone ?? 'slate'} size="small" />
          </TableCell>
          <TableCell>
            {task.assignees?.length ? (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                <UserAvatar name={task.assignees[0].fullName} size={26} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                    {task.assignees[0].fullName}
                  </Typography>
                  <Typography variant="caption" component="p" noWrap sx={{ color: colors.textSecondary }}>
                    {task.assignees.length > 1
                      ? `with ${task.assignees.length - 1} more`
                      : (task.assignees[0].designation ?? task.teamName)}
                  </Typography>
                </Box>
                {task.assignees.length > 1 ? (
                  <Tooltip title={task.assignees.slice(1).map((person) => person.fullName).join(', ')}>
                    <Stack direction="row" sx={{ alignItems: 'center', flexShrink: 0 }}>
                      {task.assignees.slice(1, 3).map((person) => (
                        <Box key={person.id} sx={{ display: 'inline-flex', ml: -0.75 }}>
                          <UserAvatar name={person.fullName} size={22} />
                        </Box>
                      ))}
                    </Stack>
                  </Tooltip>
                ) : null}
              </Stack>
            ) : (
              <Typography variant="caption" sx={{ color: STATUS_TONES.amber.strong, fontWeight: 600 }}>
                Nobody yet
              </Typography>
            )}
          </TableCell>

          <TableCell>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
              <UserAvatar name={task.createdByName} size={24} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" component="p" noWrap sx={{ fontWeight: 600 }}>
                  {task.createdByName ?? '—'}
                </Typography>
                <Typography variant="caption" component="p" noWrap sx={{ color: colors.textSecondary }}>
                  {task.createdAt ? formatDate(task.createdAt) : ''}
                </Typography>
              </Box>
            </Stack>
          </TableCell>
          <TableCell>
            <Typography
              variant="caption"
              sx={{
                whiteSpace: 'nowrap',
                color: task.isOverdue ? STATUS_TONES.rose.strong : colors.textSecondary,
                fontWeight: task.isOverdue ? 700 : 500,
              }}
            >
              {task.dueDate ? formatDate(task.dueDate) : '—'}
            </Typography>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
)

const WIDE_ONLY = { display: { xs: 'none', sm: 'table-cell' } }

const Meter = ({ value, total, tone }) => (
  <Box sx={{ mt: 0.5, height: 4, borderRadius: 999, bgcolor: STATUS_TONES[tone].soft, overflow: 'hidden' }}>
    <Box
      sx={{
        height: '100%',
        width: `${total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0}%`,
        bgcolor: STATUS_TONES[tone].strong,
        borderRadius: 999,
      }}
    />
  </Box>
)

const Count = ({ value, tone }) =>
  value > 0 ? (
    <Typography component="span" variant="body2" sx={{ fontWeight: 700, color: STATUS_TONES[tone].strong }}>
      {value}
    </Typography>
  ) : (
    <Typography component="span" variant="body2" sx={{ color: colors.border }}>
      —
    </Typography>
  )

const PersonTasks = ({ items, onOpen }) => (
  <Box sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.25, bgcolor: colors.page }}>
    <Stack spacing={0.75}>
      {items.map((task) => (
        <Stack
          key={task.id}
          direction="row"
          spacing={1.25}
          onClick={() => onOpen(task)}
          sx={{
            alignItems: 'center',
            px: 1.25,
            py: 0.875,
            borderRadius: 2,
            cursor: 'pointer',
            bgcolor: colors.surface,
            border: `1px solid ${colors.border}`,
            '&:hover': { borderColor: colors.brand },
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600, lineHeight: 1.35 }}>
              {task.title}
            </Typography>
            <Stack direction="row" spacing={0.5} useFlexGap sx={{ mt: 0.25, flexWrap: 'wrap', alignItems: 'center' }}>
              {task.clientName && task.clientName !== '—' ? (
                <ToneChip label={task.clientName} tone={task.clientTone ?? 'slate'} />
              ) : null}
              <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                by {task.createdByName ?? '—'}
              </Typography>
            </Stack>
          </Box>
          <StatusChip label={task.columnName} tone={task.columnTone ?? 'slate'} size="small" />
          <Typography
            variant="caption"
            sx={{
              width: 92,
              textAlign: 'right',
              flexShrink: 0,
              display: { xs: 'none', sm: 'block' },
              color: task.isOverdue ? STATUS_TONES.rose.strong : colors.textSecondary,
              fontWeight: task.isOverdue ? 700 : 500,
            }}
          >
            {task.dueDate ? formatDate(task.dueDate) : '—'}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              width: 56,
              textAlign: 'right',
              flexShrink: 0,
              fontWeight: 700,
              color: task.columnKind === 'completed' ? STATUS_TONES.green.strong : colors.textSecondary,
            }}
          >
            {task.columnKind === 'completed' ? `+${task.points ?? 0}` : `${task.points ?? 0} pts`}
          </Typography>
        </Stack>
      ))}
    </Stack>
  </Box>
)

const PersonRow = ({ person, open, onToggle, onOpenTask }) => {
  const subtitle = [
    person.teams.length ? person.teams.slice(0, 2).join(', ') : null,
    person.clients.length ? pluralize(person.clients.length, 'client') : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <TableRow hover onClick={onToggle} sx={{ cursor: 'pointer', '& > td': { borderBottom: open ? 0 : undefined } }}>
        <TableCell sx={{ width: 40, pr: 0 }}>
          <Box
            sx={{
              display: 'grid',
              placeItems: 'center',
              color: colors.textSecondary,
              transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 150ms ease',
            }}
          >
            <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
          </Box>
        </TableCell>
        <TableCell>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
            <UserAvatar name={person.fullName} size={30} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                {person.fullName}
              </Typography>
              <Typography variant="caption" component="p" noWrap sx={{ color: colors.textSecondary }}>
                {subtitle || pluralize(person.total, 'task')}
              </Typography>
            </Box>
          </Stack>
        </TableCell>
        <TableCell align="right" sx={WIDE_ONLY}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {person.total}
          </Typography>
          <Typography variant="caption" sx={{ color: colors.textSecondary }}>
            {person.open} open
          </Typography>
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2" sx={{ fontWeight: 700, color: STATUS_TONES.green.strong }}>
            {person.done}
          </Typography>
          <Meter value={person.done} total={person.total} tone="green" />
        </TableCell>
        <TableCell align="right" sx={WIDE_ONLY}>
          <Count value={person.correction} tone="rose" />
        </TableCell>
        <TableCell align="right">
          <Count value={person.overdue} tone="amber" />
        </TableCell>
        <TableCell align="right">
          <Box>
            <Typography component="span" variant="body2" sx={{ fontWeight: 700, color: STATUS_TONES.orange.strong }}>
              {person.earned}
            </Typography>
            <Typography component="span" variant="caption" sx={{ color: colors.textSecondary }}>
              {' '}
              / {person.points}
            </Typography>
            <Meter value={person.earned} total={person.points} tone="orange" />
          </Box>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={7} sx={{ p: 0, borderBottom: open ? `1px solid ${colors.border}` : 0 }}>
          <Collapse in={open} unmountOnExit>
            <PersonTasks items={person.items} onOpen={onOpenTask} />
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

const PointsRows = ({ people, onOpenTask }) => {
  const [expanded, setExpanded] = useState(() => new Set())
  const totals = totalsOf(people)

  const toggle = (personId) => {
    const next = new Set(expanded)
    if (next.has(personId)) next.delete(personId)
    else next.add(personId)
    setExpanded(next)
  }

  return (
    <Table size="small" stickyHeader sx={{ minWidth: 640 }}>
      <TableHead>
        <TableRow>
          <TableCell sx={{ ...HEAD, width: 40, pr: 0 }} />
          <TableCell sx={{ ...HEAD, minWidth: 190 }}>Person</TableCell>
          <TableCell sx={{ ...HEAD, ...WIDE_ONLY, width: 90 }} align="right">
            Tasks
          </TableCell>
          <TableCell sx={{ ...HEAD, width: 100 }} align="right">
            Completed
          </TableCell>
          <TableCell sx={{ ...HEAD, ...WIDE_ONLY, width: 110 }} align="right">
            In correction
          </TableCell>
          <TableCell sx={{ ...HEAD, width: 90 }} align="right">
            Overdue
          </TableCell>
          <TableCell sx={{ ...HEAD, width: 130 }} align="right">
            Points earned
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {people.map((person) => (
          <PersonRow
            key={person.id}
            person={person}
            open={expanded.has(person.id)}
            onToggle={() => toggle(person.id)}
            onOpenTask={onOpenTask}
          />
        ))}
        <TableRow sx={{ bgcolor: colors.page }}>
          <TableCell sx={{ borderBottom: 0 }} />
          <TableCell sx={{ borderBottom: 0 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: colors.textSecondary }}>
              Everyone
            </Typography>
          </TableCell>
          <TableCell align="right" sx={{ ...WIDE_ONLY, borderBottom: 0, fontWeight: 700 }}>
            {totals.total}
          </TableCell>
          <TableCell align="right" sx={{ borderBottom: 0, fontWeight: 700 }}>
            {totals.done}
          </TableCell>
          <TableCell align="right" sx={{ ...WIDE_ONLY, borderBottom: 0, fontWeight: 700 }}>
            {totals.correction}
          </TableCell>
          <TableCell align="right" sx={{ borderBottom: 0, fontWeight: 700 }}>
            {totals.overdue}
          </TableCell>
          <TableCell align="right" sx={{ borderBottom: 0 }}>
            <Typography component="span" variant="body2" sx={{ fontWeight: 700, color: STATUS_TONES.orange.strong }}>
              {totals.earned}
            </Typography>
            <Typography component="span" variant="caption" sx={{ color: colors.textSecondary }}>
              {' '}
              / {totals.points}
            </Typography>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}

export const SummaryDetailsDialog = ({ kind, workspaceId, scope, range, periodLabel, onClose, onOpenTask }) => {
  const config = SUMMARY_KINDS[kind] ?? SUMMARY_KINDS.tasks
  const Icon = config.icon

  const query = useMemo(() => ({ ...scope, ...range }), [scope, range])
  const board = useAsync(taskService.getBoard, [workspaceId, query], { enabled: Boolean(workspaceId) })

  const all = flatten(board.data)
  const tasks = all.filter(config.keep)
  const people = kind === 'points' ? byPerson(all) : []
  const pointTotals = totalsOf(people)

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1.25 }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 1.75,
              bgcolor: STATUS_TONES[config.tone].soft,
              color: STATUS_TONES[config.tone].strong,
              flexShrink: 0,
            }}
          >
            <Icon size={16} strokeWidth={2} aria-hidden="true" />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 650, lineHeight: 1.3 }}>{config.title}</Typography>
            <Typography variant="caption" sx={{ color: colors.textSecondary }}>
              {periodLabel}
              {kind === 'points'
                ? ` · ${pluralize(people.length, 'person', 'people')} · ${pointTotals.earned} of ${pointTotals.points} points earned`
                : ` · ${pluralize(tasks.length, 'task')}`}
            </Typography>
          </Box>
          <IconButton size="small" aria-label="Close" onClick={onClose}>
            <X size={16} strokeWidth={1.75} />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0, maxHeight: '70vh' }}>
        <QueryStateView error={board.error} onRetry={board.reload}>
          {board.loading && !board.data ? (
            <Box sx={{ p: 2 }}>
              <ListSectionSkeleton rows={5} wide />
            </Box>
          ) : kind === 'points' ? (
            people.length === 0 ? (
              <EmptyState icon={Gauge} title="No points yet" description="Nothing has been earned in this period." />
            ) : (
              <PointsRows people={people} onOpenTask={onOpenTask} />
            )
          ) : tasks.length === 0 ? (
            <EmptyState icon={config.icon} title={`No ${config.title.toLowerCase()}`} description="Nothing here for this period." />
          ) : (
            <TaskRows tasks={tasks} onOpen={onOpenTask} />
          )}
        </QueryStateView>
      </DialogContent>
    </Dialog>
  )
}
