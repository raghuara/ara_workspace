import { useState } from 'react'
import {
  Box,
  Button,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { AlignLeft, ChevronDown, Flag, MessageSquare, Paperclip, Plus, TriangleAlert } from 'lucide-react'
import { StatusChip } from '@/components/StatusChip'
import { ToneChip } from '@/components/ToneChip'
import { UserAvatar } from '@/components/UserAvatar'
import { EmptyState } from '@/components/EmptyState'
import { taskService } from '@/api/taskService'
import { PERMISSIONS } from '@/constants/permissions'
import { PRIORITY_TONES, STATUS_TONES } from '@/constants/workspaceDomain'
import { usePermissions } from '@/hooks/usePermissions'
import { useWorkspace } from '@/hooks/useWorkspace'
import { colors } from '@/theme/tokens'
import { formatRelativeDay } from '@/utils/date'

// One template shared by the header and every row so columns line up across groups.
const GRID = {
  xs: 'minmax(0, 1fr)',
  md: 'minmax(0, 1fr) 132px 116px 116px 72px',
}

const HEAD_CELL = {
  fontSize: '0.6875rem',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: colors.textSecondary,
}

const StatusDot = ({ task, columns, canMove, onChanged }) => {
  const [anchor, setAnchor] = useState(null)
  const tone = STATUS_TONES[task.statusTone] ?? STATUS_TONES.slate

  const move = async (statusId) => {
    setAnchor(null)
    if (statusId === task.statusId) return
    await taskService.moveTask(task.id, statusId)
    onChanged?.()
  }

  const dot = (
    <Box
      aria-hidden="true"
      sx={{
        width: 13,
        height: 13,
        borderRadius: '50%',
        border: `2.5px solid ${tone.strong}`,
        bgcolor: task.statusKind === 'completed' ? tone.strong : 'transparent',
      }}
    />
  )

  if (!canMove) return <Box sx={{ display: 'flex', p: '5px' }}>{dot}</Box>

  return (
    <>
      <Tooltip title={`Status: ${task.statusName}`}>
        <IconButton
          size="small"
          aria-label={`Change status of ${task.title}. Currently ${task.statusName}`}
          onClick={(event) => {
            event.stopPropagation()
            setAnchor(event.currentTarget)
          }}
          sx={{ p: '5px' }}
        >
          {dot}
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        onClick={(event) => event.stopPropagation()}
        sx={{ '& .MuiPaper-root': { minWidth: 190 } }}
      >
        {columns.map((column) => {
          const optionTone = STATUS_TONES[column.tone] ?? STATUS_TONES.slate
          return (
            <MenuItem key={column.id} selected={column.id === task.statusId} onClick={() => move(column.id)} sx={{ gap: 1.25 }}>
              <Box
                aria-hidden="true"
                sx={{ width: 11, height: 11, borderRadius: '50%', border: `2.5px solid ${optionTone.strong}` }}
              />
              <Typography variant="body2">{column.name}</Typography>
            </MenuItem>
          )
        })}
      </Menu>
    </>
  )
}

const TaskRow = ({ task, columns, canMove, onOpenTask, onChanged }) => {
  const priorityTone = STATUS_TONES[PRIORITY_TONES[task.priority] ?? 'gray']

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => onOpenTask?.(task)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onOpenTask?.(task)
      }}
      aria-label={`Open ${task.title}`}
      sx={{
        display: 'grid',
        gridTemplateColumns: GRID,
        alignItems: 'center',
        gap: { xs: 0.75, md: 1.5 },
        px: { xs: 1.25, md: 2 },
        py: 1,
        cursor: 'pointer',
        borderBottom: `1px solid ${colors.border}`,
        '&:last-of-type': { borderBottom: 0 },
        '&:hover': { bgcolor: colors.page },
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
        <StatusDot task={task} columns={columns} canMove={canMove} onChanged={onChanged} />
        <Typography variant="body2" fontWeight={500} noWrap sx={{ minWidth: 0 }}>
          {task.title}
        </Typography>

        {task.description ? (
          <Tooltip title="Has a description">
            <Box sx={{ display: 'inline-flex', color: colors.textSecondary, flexShrink: 0 }}>
              <AlignLeft size={13} strokeWidth={1.75} aria-label="Has a description" />
            </Box>
          </Tooltip>
        ) : null}
        {task.attachmentCount > 0 ? (
          <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center', color: colors.textSecondary, flexShrink: 0 }}>
            <Paperclip size={12} strokeWidth={1.75} aria-hidden="true" />
            <Typography variant="caption">{task.attachmentCount}</Typography>
          </Stack>
        ) : null}
        {task.commentCount > 0 ? (
          <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center', color: colors.textSecondary, flexShrink: 0 }}>
            <MessageSquare size={12} strokeWidth={1.75} aria-hidden="true" />
            <Typography variant="caption">{task.commentCount}</Typography>
          </Stack>
        ) : null}

        <Box sx={{ flexShrink: 0, ml: 0.25 }}>
          <ToneChip label={task.clientName} tone={task.clientTone} />
        </Box>
      </Stack>

      <Stack direction="row" sx={{ alignItems: 'center', ml: { xs: 3.5, md: 0 } }}>
        {task.assignees.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            Unassigned
          </Typography>
        ) : (
          task.assignees.slice(0, 3).map((assignee, index) => (
            <Tooltip key={assignee.id} title={assignee.fullName}>
              <Box sx={{ ml: index === 0 ? 0 : -0.75 }}>
                <UserAvatar name={assignee.fullName} size={24} />
              </Box>
            </Tooltip>
          ))
        )}
        {task.assignees.length > 3 ? (
          <Typography variant="caption" sx={{ ml: 0.5 }}>
            +{task.assignees.length - 3}
          </Typography>
        ) : null}
      </Stack>

      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', ml: { xs: 3.5, md: 0 } }}>
        {task.isOverdue ? (
          <TriangleAlert size={12} strokeWidth={2} color={STATUS_TONES.rose.strong} aria-hidden="true" />
        ) : null}
        <Typography
          variant="caption"
          sx={{
            color: task.isOverdue ? STATUS_TONES.rose.strong : colors.textSecondary,
            fontWeight: task.isOverdue ? 600 : 400,
          }}
        >
          {formatRelativeDay(task.dueDate)}
        </Typography>
      </Stack>

      <Stack direction="row" spacing={0.625} sx={{ alignItems: 'center', ml: { xs: 3.5, md: 0 } }}>
        <Flag size={13} strokeWidth={2} color={priorityTone.strong} aria-hidden="true" />
        <Typography variant="caption" sx={{ color: colors.textPrimary }}>
          {task.priority}
        </Typography>
      </Stack>

      <Box sx={{ ml: { xs: 3.5, md: 0 }, justifySelf: { md: 'end' } }}>
        <ToneChip label={`${task.points}`} tone="teal" />
      </Box>
    </Box>
  )
}

export const ListView = ({ board, loading, onOpenTask, onAddTask, onChanged }) => {
  const { can } = usePermissions()
  const { columns } = useWorkspace()
  const canMove = can(PERMISSIONS.TASK_MOVE)
  const canCreate = can(PERMISSIONS.TASK_CREATE)

  const [collapsed, setCollapsed] = useState({})

  if (loading && !board) return <LinearProgress aria-label="Loading tasks" />

  const groups = board?.columns.filter((column) => column.tasks.length > 0 || canCreate) ?? []
  if (groups.length === 0) {
    return <EmptyState title="No tasks match these filters" description="Try widening the filters above." />
  }

  return (
    <Stack spacing={2}>
      {groups.map((column) => {
        const tone = STATUS_TONES[column.tone] ?? STATUS_TONES.slate
        const isOpen = !collapsed[column.id]

        return (
          <Box key={column.id}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75 }}>
              <IconButton
                size="small"
                onClick={() => setCollapsed((current) => ({ ...current, [column.id]: isOpen }))}
                aria-expanded={isOpen}
                aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${column.name}`}
                sx={{
                  p: 0.25,
                  color: colors.textSecondary,
                  transform: isOpen ? 'none' : 'rotate(-90deg)',
                  transition: 'transform 140ms ease',
                }}
              >
                <ChevronDown size={16} strokeWidth={2} />
              </IconButton>

              <StatusChip label={column.name} tone={column.tone} />
              <Typography variant="caption" sx={{ fontWeight: 600, color: colors.textSecondary }}>
                {column.taskCount}
              </Typography>
              {column.points > 0 ? (
                <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                  · {column.points} pts
                </Typography>
              ) : null}

              <Box sx={{ flex: 1 }} />

              {canCreate ? (
                <Button
                  size="small"
                  variant="text"
                  onClick={() => onAddTask?.(column.id)}
                  startIcon={<Plus size={14} strokeWidth={2} />}
                  sx={{ color: colors.textSecondary }}
                >
                  Add task
                </Button>
              ) : null}
            </Stack>

            {isOpen ? (
              <Box
                sx={{
                  bgcolor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 2,
                  overflow: 'hidden',
                  // The group's colour reads as a spine down the left edge
                  // instead of tinting rows and fighting the task text.
                  borderLeft: `3px solid ${tone.strong}`,
                }}
              >
                <Box
                  sx={{
                    display: { xs: 'none', md: 'grid' },
                    gridTemplateColumns: GRID,
                    gap: 1.5,
                    px: 2,
                    py: 0.875,
                    bgcolor: colors.page,
                    borderBottom: `1px solid ${colors.border}`,
                  }}
                >
                  <Typography sx={HEAD_CELL}>Name</Typography>
                  <Typography sx={HEAD_CELL}>Assignee</Typography>
                  <Typography sx={HEAD_CELL}>Due date</Typography>
                  <Typography sx={HEAD_CELL}>Priority</Typography>
                  <Typography sx={{ ...HEAD_CELL, justifySelf: 'end' }}>Pts</Typography>
                </Box>

                {column.tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    columns={columns}
                    canMove={canMove}
                    onOpenTask={onOpenTask}
                    onChanged={onChanged}
                  />
                ))}

                {column.tasks.length === 0 ? (
                  <Typography variant="caption" component="p" sx={{ px: 2, py: 1.5, color: colors.textSecondary }}>
                    Nothing in {column.name} right now.
                  </Typography>
                ) : null}

                {canCreate ? (
                  <Box
                    component="button"
                    type="button"
                    onClick={() => onAddTask?.(column.id)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      width: '100%',
                      border: 0,
                      bgcolor: 'transparent',
                      cursor: 'pointer',
                      px: 2,
                      py: 1,
                      color: colors.textSecondary,
                      fontSize: '0.8125rem',
                      borderTop: `1px solid ${colors.border}`,
                      '&:hover': { bgcolor: colors.page, color: colors.brand },
                    }}
                  >
                    <Plus size={14} strokeWidth={2} aria-hidden="true" />
                    Add task
                  </Box>
                ) : null}
              </Box>
            ) : null}
          </Box>
        )
      })}
    </Stack>
  )
}
