import { useMemo, useState } from 'react'
import {
  Box,
  IconButton,
  InputBase,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from '@mui/material'
import { AlignLeft, Flag, Maximize2, Paperclip, Pencil, TextCursorInput, TriangleAlert } from 'lucide-react'
import { StatusChip } from '@/components/StatusChip'
import { ToneChip } from '@/components/ToneChip'
import { UserAvatar } from '@/components/UserAvatar'
import { EmptyState } from '@/components/EmptyState'
import { QuickAddCard } from '../components/QuickAddCard'
import { taskService } from '@/api/taskService'
import { PERMISSIONS } from '@/constants/permissions'
import { usePermissions } from '@/hooks/usePermissions'
import { useAccess } from '@/hooks/useAccess'
import { PRIORITY_TONES, STATUS_TONES } from '@/constants/workspaceDomain'
import { colors } from '@/theme/tokens'
import { formatDate, formatRelativeDay } from '@/utils/date'

const COLUMNS = [
  { key: 'index', label: '#', sortable: false, width: 44, align: 'center' },
  { key: 'title', label: 'Name', sortable: true, minWidth: 300 },
  { key: 'assignees', label: 'Assignee', sortable: false, width: 190 },
  { key: 'statusName', label: 'Status', sortable: true, width: 150 },
  { key: 'clientName', label: 'Client', sortable: true, width: 130 },
  { key: 'dueDate', label: 'Due date', sortable: true, width: 130 },
  { key: 'priority', label: 'Priority', sortable: true, width: 120 },
  { key: 'points', label: 'Pts', sortable: true, width: 70, align: 'right' },
]

const PRIORITY_ORDER = { Urgent: 0, High: 1, Normal: 2, Low: 3 }

const TitleCell = ({ task, canUpdate, onChanged, onEdit }) => {
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(task.title)
  const stop = (event) => event.stopPropagation()

  const commitRename = async () => {
    setRenaming(false)
    const title = draft.trim()
    if (!title || title === task.title) return
    try {
      await taskService.updateTask(task.id, { title })
      onChanged?.()
    } catch {
      setDraft(task.title)
    }
  }

  if (renaming) {
    return (
      <InputBase
        autoFocus
        fullWidth
        value={draft}
        aria-label="Rename task"
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.target.select()}
        onBlur={commitRename}
        onClick={stop}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === 'Enter') {
            event.preventDefault()
            commitRename()
          }
          if (event.key === 'Escape') {
            setDraft(task.title)
            setRenaming(false)
          }
        }}
        sx={{
          flex: 1,
          minWidth: 0,
          px: 0.75,
          py: 0.125,
          fontSize: '0.875rem',
          fontWeight: 500,
          borderRadius: 1,
          bgcolor: colors.surface,
          boxShadow: `0 0 0 2px ${colors.brand}`,
        }}
      />
    )
  }

  return (
    <>
      <Typography variant="body2" fontWeight={500} noWrap sx={{ minWidth: 0 }}>
        {task.title}
      </Typography>
      {canUpdate ? (
        <Stack
          direction="row"
          spacing={0}
          className="row-actions"
          sx={{ opacity: 0, transition: 'opacity 120ms', flexShrink: 0 }}
        >
          <Tooltip title="Rename">
            <IconButton
              size="small"
              aria-label={`Rename ${task.title}`}
              onClick={(event) => {
                stop(event)
                setDraft(task.title)
                setRenaming(true)
              }}
              sx={{ p: 0.375 }}
            >
              <TextCursorInput size={14} strokeWidth={1.75} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton
              size="small"
              aria-label={`Edit ${task.title}`}
              onClick={(event) => {
                stop(event)
                onEdit?.(task)
              }}
              sx={{ p: 0.375 }}
            >
              <Pencil size={14} strokeWidth={1.75} />
            </IconButton>
          </Tooltip>
        </Stack>
      ) : null}
    </>
  )
}

export const TableView = ({ board, loading, onOpenTask, onChanged }) => {
  const { can } = usePermissions()
  const canUpdate = can(PERMISSIONS.TASK_UPDATE)
  const { canEditTask } = useAccess()
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [orderBy, setOrderBy] = useState('dueDate')
  const [direction, setDirection] = useState('asc')

  const rows = useMemo(() => {
    const all = board?.columns.flatMap((column) => column.tasks) ?? []
    const sorted = [...all].sort((a, b) => {
      // Priority is meaningful by rank, not alphabetically.
      if (orderBy === 'priority') {
        return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)
      }
      const left = a[orderBy]
      const right = b[orderBy]
      if (typeof left === 'number' && typeof right === 'number') return left - right
      return String(left ?? '').localeCompare(String(right ?? ''))
    })
    return direction === 'asc' ? sorted : sorted.reverse()
  }, [board, orderBy, direction])

  const toggleSort = (key) => {
    if (orderBy === key) {
      setDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setOrderBy(key)
    setDirection('asc')
  }

  if (loading && !board) return <LinearProgress aria-label="Loading tasks" />

  return (
    <Box
      sx={{
        bgcolor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 2.5,
        overflow: 'hidden',
      }}
    >
      <TableContainer sx={{ maxHeight: { xs: 'none', md: 'calc(100dvh - 280px)' } }}>
        <Table stickyHeader size="small" sx={{ minWidth: 1120 }}>
          <TableHead>
            <TableRow>
              {COLUMNS.map((column) => (
                <TableCell
                  key={column.key}
                  align={column.align ?? 'left'}
                  sx={{ width: column.width, minWidth: column.minWidth, bgcolor: colors.page }}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={orderBy === column.key}
                      direction={orderBy === column.key ? direction : 'asc'}
                      onClick={() => toggleSort(column.key)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.map((task, index) => {
              const statusTone = STATUS_TONES[task.statusTone] ?? STATUS_TONES.slate
              const priorityTone = STATUS_TONES[PRIORITY_TONES[task.priority] ?? 'gray']

              if (editingTaskId === task.id) {
                const column = board?.columns.find((item) => item.id === task.statusId) ?? {
                  id: task.statusId,
                  kind: task.statusKind,
                }
                return (
                  <TableRow key={task.id}>
                    <TableCell colSpan={COLUMNS.length} sx={{ p: 1.5, bgcolor: colors.page }}>
                      <QuickAddCard
                        column={column}
                        task={task}
                        onCancel={() => setEditingTaskId(null)}
                        onSaved={() => {
                          setEditingTaskId(null)
                          onChanged?.()
                        }}
                      />
                    </TableCell>
                  </TableRow>
                )
              }

              return (
                <TableRow
                  key={task.id}
                  hover
                  tabIndex={0}
                  onClick={() => onOpenTask?.(task)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') onOpenTask?.(task)
                  }}
                  aria-label={`Open ${task.title}`}
                  sx={{
                    cursor: 'pointer',
                    '&:hover .row-open': { opacity: 1 },
                    '&:hover .row-actions': { opacity: 1 },
                  }}
                >
                  <TableCell align="center">
                    <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                      {index + 1}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                      <Box
                        aria-hidden="true"
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          flexShrink: 0,
                          border: `2.5px solid ${statusTone.strong}`,
                          bgcolor: task.statusKind === 'completed' ? statusTone.strong : 'transparent',
                        }}
                      />
                      <TitleCell
                        task={task}
                        canUpdate={canUpdate && canEditTask(task)}
                        onChanged={onChanged}
                        onEdit={(target) => setEditingTaskId(target.id)}
                      />

                      {task.description ? (
                        <Box sx={{ display: 'inline-flex', color: colors.textSecondary, flexShrink: 0 }}>
                          <AlignLeft size={12} strokeWidth={1.75} aria-label="Has a description" />
                        </Box>
                      ) : null}
                      {task.attachmentCount > 0 ? (
                        <Stack
                          direction="row"
                          spacing={0.25}
                          sx={{ alignItems: 'center', color: colors.textSecondary, flexShrink: 0 }}
                        >
                          <Paperclip size={11} strokeWidth={1.75} aria-hidden="true" />
                          <Typography variant="caption">{task.attachmentCount}</Typography>
                        </Stack>
                      ) : null}

                      <Box sx={{ flex: 1 }} />
                      <Box
                        className="row-open"
                        sx={{ display: 'inline-flex', color: colors.textSecondary, opacity: 0, flexShrink: 0 }}
                      >
                        <Maximize2 size={13} strokeWidth={1.75} aria-hidden="true" />
                      </Box>
                    </Stack>
                  </TableCell>

                  <TableCell>
                    {task.assignees.length === 0 ? (
                      <Typography variant="caption" color="text.secondary">
                        Unassigned
                      </Typography>
                    ) : (
                      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
                        <Stack direction="row">
                          {task.assignees.slice(0, 3).map((assignee, position) => (
                            <Tooltip key={assignee.id} title={assignee.fullName}>
                              <Box sx={{ ml: position === 0 ? 0 : -0.75 }}>
                                <UserAvatar name={assignee.fullName} size={24} />
                              </Box>
                            </Tooltip>
                          ))}
                        </Stack>
                        <Typography variant="caption" noWrap sx={{ minWidth: 0 }}>
                          {task.assignees
                            .slice(0, 2)
                            .map((assignee) => assignee.fullName.split(' ')[0])
                            .join(', ')}
                          {task.assignees.length > 2 ? ` +${task.assignees.length - 2}` : ''}
                        </Typography>
                      </Stack>
                    )}
                  </TableCell>

                  <TableCell>
                    <StatusChip label={task.statusName} tone={task.statusTone} size="small" />
                  </TableCell>

                  <TableCell>
                    <ToneChip label={task.clientName} tone={task.clientTone} />
                  </TableCell>

                  <TableCell>
                    <Tooltip title={formatDate(task.dueDate)}>
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                        {task.isOverdue ? (
                          <TriangleAlert
                            size={12}
                            strokeWidth={2}
                            color={STATUS_TONES.rose.strong}
                            aria-hidden="true"
                          />
                        ) : null}
                        <Typography
                          variant="body2"
                          sx={{
                            color: task.isOverdue ? STATUS_TONES.rose.strong : colors.textPrimary,
                            fontWeight: task.isOverdue ? 600 : 400,
                          }}
                        >
                          {formatRelativeDay(task.dueDate)}
                        </Typography>
                      </Stack>
                    </Tooltip>
                  </TableCell>

                  <TableCell>
                    <Stack direction="row" spacing={0.625} sx={{ alignItems: 'center' }}>
                      <Flag size={13} strokeWidth={2} color={priorityTone.strong} aria-hidden="true" />
                      <Typography variant="body2">{task.priority}</Typography>
                    </Stack>
                  </TableCell>

                  <TableCell align="right">
                    <ToneChip label={`${task.points}`} tone="teal" />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {rows.length === 0 ? (
        <EmptyState title="No tasks match these filters" description="Try widening the filters above." />
      ) : null}
    </Box>
  )
}
