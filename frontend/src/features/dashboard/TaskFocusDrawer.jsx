import { useMemo, useState } from 'react'
import { Box, Button, Drawer, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import { ArrowRight, ChevronRight, Clock3, TriangleAlert, Users, X } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
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

const GROUPINGS = [
  { key: 'person', label: 'By person' },
  { key: 'team', label: 'By team' },
  { key: 'workspace', label: 'By company' },
]

const UNASSIGNED = { id: 'none', name: 'Not assigned' }

const dueText = (task) => {
  const diff = daysUntil(task.dueDate)
  if (diff === null) return 'No due date'
  if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} late`
  if (diff === 0) return 'Due today'
  if (diff === 1) return 'Tomorrow'
  return `In ${diff} days`
}

const groupTasks = (tasks, grouping, workspaceNames) => {
  const buckets = new Map()

  const add = (key, name, task, extra = {}) => {
    if (!buckets.has(key)) buckets.set(key, { key, name, tasks: [], ...extra })
    buckets.get(key).tasks.push(task)
  }

  tasks.forEach((task) => {
    if (grouping === 'person') {
      if (task.assignees.length === 0) add(UNASSIGNED.id, UNASSIGNED.name, task)
      else task.assignees.forEach((person) => add(person.id, person.fullName, task, { person: true }))
      return
    }
    if (grouping === 'team') {
      const name = task.teamName && task.teamName !== '—' ? task.teamName : 'No team'
      add(`${task.workspaceId}:${name}`, name, task, { hint: task.groupName })
      return
    }
    add(task.workspaceId, workspaceNames.get(task.workspaceId) ?? 'Company', task)
  })

  return [...buckets.values()].sort((a, b) => b.tasks.length - a.tasks.length || a.name.localeCompare(b.name))
}

const GroupRow = ({ row, share, selected, onClick }) => (
  <Box
    component="button"
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      width: '100%',
      px: 1.25,
      py: 0.875,
      border: `1px solid ${selected ? colors.brand : 'transparent'}`,
      borderRadius: 1.5,
      bgcolor: selected ? colors.brandSoft : 'transparent',
      font: 'inherit',
      textAlign: 'left',
      cursor: 'pointer',
      '&:hover': { bgcolor: selected ? colors.brandSoft : colors.page },
      '&:focus-visible': { outline: 'none', boxShadow: `0 0 0 2px ${colors.surface}, 0 0 0 4px ${colors.brand}` },
    }}
  >
    {row.person ? <UserAvatar name={row.name} size={26} /> : null}
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="body2" noWrap sx={{ fontWeight: selected ? 700 : 600 }}>
        {row.name}
      </Typography>
      <Box sx={{ mt: 0.5, height: 5, borderRadius: 999, bgcolor: colors.neutralSoft, overflow: 'hidden' }}>
        <Box sx={{ width: `${share}%`, height: '100%', borderRadius: 999, bgcolor: colors.brand }} />
      </Box>
      {row.hint ? (
        <Typography variant="caption" component="p" noWrap sx={{ mt: 0.25 }}>
          {row.hint}
        </Typography>
      ) : null}
    </Box>
    <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
      {row.tasks.length}
    </Typography>
  </Box>
)

const TaskRow = ({ task, workspaceName, onOpen }) => {
  const late = task.isOverdue
  const tone = late ? STATUS_TONES.rose : daysUntil(task.dueDate) === 0 ? STATUS_TONES.amber : STATUS_TONES.slate

  return (
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
        gap: 1.25,
        px: 1.75,
        py: 1.125,
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
        <Stack direction="row" spacing={0.75} useFlexGap sx={{ mt: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <StatusChip label={task.statusName} tone={task.statusTone} size="small" />
          <ToneChip label={workspaceName} tone="slate" />
          {task.clientName && task.clientName !== '—' ? <ToneChip label={task.clientName} tone={task.clientTone} /> : null}
          <Typography variant="caption" noWrap sx={{ color: colors.textSecondary }}>
            {[task.groupName, task.teamName].filter((name) => name && name !== '—').join(' · ')}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} useFlexGap sx={{ mt: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
          {task.assignees.length === 0 ? (
            <Typography variant="caption" sx={{ color: STATUS_TONES.amber.strong }}>
              Not assigned
            </Typography>
          ) : (
            task.assignees.map((person) => (
              <Stack key={person.id} direction="row" spacing={0.5} sx={{ alignItems: 'center', mr: 0.75 }}>
                <UserAvatar name={person.fullName} size={20} />
                <Typography variant="caption" noWrap>
                  {person.fullName}
                </Typography>
              </Stack>
            ))
          )}
        </Stack>
      </Box>

      <Stack spacing={0.375} sx={{ alignItems: 'flex-end', flexShrink: 0 }}>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: tone.strong }}>
          {late ? <TriangleAlert size={12} strokeWidth={2.25} /> : <Clock3 size={12} strokeWidth={2} />}
          <Typography variant="caption" sx={{ color: 'inherit', fontWeight: 700, whiteSpace: 'nowrap' }}>
            {dueText(task)}
          </Typography>
        </Stack>
        <Tooltip title={task.dueDate ? `Due ${formatDate(task.dueDate)}` : 'No due date set'}>
          <Typography variant="caption" sx={{ color: colors.textSecondary }}>
            {task.points} pts
          </Typography>
        </Tooltip>
      </Stack>
      <ChevronRight size={16} strokeWidth={2} color={colors.textSecondary} aria-hidden="true" />
    </Box>
  )
}

export const TaskFocusDrawer = ({ focus, workspaces, range, periodLabel, onClose, onOpenTask, onOpenBoard }) => {
  const [grouping, setGrouping] = useState('person')
  const [selected, setSelected] = useState(null)

  const workspaceIds = useMemo(() => workspaces.map((workspace) => workspace.id), [workspaces])
  const workspaceNames = useMemo(
    () => new Map(workspaces.map((workspace) => [workspace.id, workspace.name])),
    [workspaces],
  )
  const filters = useMemo(() => ({ ...focus.filters, ...(range ?? {}) }), [focus.filters, range])

  const query = useAsync(dashboardService.collectTasks, [workspaceIds, filters], {
    enabled: workspaceIds.length > 0,
  })

  const tasks = useMemo(() => {
    const all = query.data ?? []
    return focus.match ? all.filter(focus.match) : all
  }, [query.data, focus])

  const groups = useMemo(() => groupTasks(tasks, grouping, workspaceNames), [tasks, grouping, workspaceNames])
  const biggest = groups[0]?.tasks.length ?? 1
  const shown = selected ? (groups.find((group) => group.key === selected)?.tasks ?? []) : tasks

  return (
    <Drawer
      anchor="right"
      open
      onClose={onClose}
      aria-label={`${focus.label} details`}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 620 } } } }}
    >
      <Box sx={{ px: 2, pt: 1.75, pb: 1.5, borderBottom: `1px solid ${colors.border}`, bgcolor: colors.page }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h3" component="h2">
              {focus.label}
            </Typography>
            <Typography variant="caption" component="p" sx={{ mt: 0.25 }}>
              {focus.description} · {periodLabel}
            </Typography>
          </Box>
          <ToneChip label={`${tasks.length} tasks`} tone={focus.tone ?? 'blue'} size="medium" />
          <IconButton size="small" aria-label="Close" onClick={onClose}>
            <X size={16} strokeWidth={1.75} />
          </IconButton>
        </Stack>

        <Stack direction="row" spacing={0.75} sx={{ mt: 1.5, flexWrap: 'wrap' }} useFlexGap>
          {GROUPINGS.map((option) => (
            <Box
              key={option.key}
              component="button"
              type="button"
              onClick={() => {
                setGrouping(option.key)
                setSelected(null)
              }}
              aria-pressed={grouping === option.key}
              sx={{
                height: 28,
                px: 1.25,
                border: `1px solid ${grouping === option.key ? colors.brand : colors.border}`,
                borderRadius: 999,
                bgcolor: grouping === option.key ? colors.brand : colors.surface,
                color: grouping === option.key ? '#FFFFFF' : colors.textPrimary,
                font: 'inherit',
                fontSize: '0.75rem',
                fontWeight: grouping === option.key ? 650 : 500,
                cursor: 'pointer',
              }}
            >
              {option.label}
            </Box>
          ))}
          {selected ? (
            <Button size="small" variant="text" onClick={() => setSelected(null)}>
              Clear selection
            </Button>
          ) : null}
        </Stack>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <QueryStateView error={query.error} onRetry={query.reload}>
          {query.loading && !query.data ? (
            <Box sx={{ p: 2 }}>
              <ListSectionSkeleton rows={5} wide />
            </Box>
          ) : tasks.length === 0 ? (
            <EmptyState icon={Users} title="Nothing here" description={`No ${focus.label.toLowerCase()} in ${periodLabel}.`} />
          ) : (
            <>
              <Box sx={{ px: 1.5, py: 1.25, borderBottom: `1px solid ${colors.border}` }}>
                <Typography
                  component="p"
                  sx={{
                    mb: 0.75,
                    px: 0.25,
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                    color: colors.textSecondary,
                  }}
                >
                  {GROUPINGS.find((option) => option.key === grouping)?.label} · tap to filter
                </Typography>
                <Stack spacing={0.25} sx={{ maxHeight: 232, overflowY: 'auto' }}>
                  {groups.map((row) => (
                    <GroupRow
                      key={row.key}
                      row={row}
                      share={Math.round((row.tasks.length / biggest) * 100)}
                      selected={selected === row.key}
                      onClick={() => setSelected(selected === row.key ? null : row.key)}
                    />
                  ))}
                </Stack>
              </Box>

              <Box>
                {shown.map((task) => (
                  <TaskRow
                    key={`${task.workspaceId}-${task.id}`}
                    task={task}
                    workspaceName={workspaceNames.get(task.workspaceId) ?? '—'}
                    onOpen={onOpenTask}
                  />
                ))}
              </Box>
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
        <Button
          variant="contained"
          onClick={() => onOpenBoard(focus)}
          endIcon={<ArrowRight size={14} strokeWidth={2} />}
        >
          Open in board
        </Button>
      </Stack>
    </Drawer>
  )
}
