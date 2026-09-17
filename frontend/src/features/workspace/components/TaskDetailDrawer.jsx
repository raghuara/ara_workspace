import { Box, Button, Divider, Drawer, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { Pencil, Repeat, Trash2, X } from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'
import { StatusChip } from '@/components/StatusChip'
import { ToneChip } from '@/components/ToneChip'
import { UserAvatar } from '@/components/UserAvatar'
import { DefinitionList } from '@/components/DefinitionList'
import { QueryStateView } from '@/components/QueryStateView'
import { taskService } from '@/api/taskService'
import { HISTORY_ACTIONS, PRIORITY_TONES, STATUS_TONES, sizeByKey } from '@/constants/workspaceDomain'
import { PERMISSIONS } from '@/constants/permissions'
import { ROUTES } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { usePermissions } from '@/hooks/usePermissions'
import { useAccess } from '@/hooks/useAccess'
import { useWorkspace } from '@/hooks/useWorkspace'
import { TaskAttachments } from './TaskAttachments'
import { colors } from '@/theme/tokens'
import { formatDate, formatRelativeDay } from '@/utils/date'

const ACTION_TONES = {
  [HISTORY_ACTIONS.CREATED]: 'blue',
  [HISTORY_ACTIONS.MOVED]: 'violet',
  [HISTORY_ACTIONS.UPDATED]: 'amber',
  [HISTORY_ACTIONS.ASSIGNED]: 'teal',
  [HISTORY_ACTIONS.COMPLETED]: 'green',
  [HISTORY_ACTIONS.DELETED]: 'rose',
  [HISTORY_ACTIONS.COMMENTED]: 'slate',
}

const describeDetail = (entry) => {
  if (!entry.detail) return null
  if (entry.detail.from && entry.detail.to) return `${entry.detail.from} → ${entry.detail.to}`
  if (entry.detail.fields) return `Changed: ${entry.detail.fields.join(', ')}`
  if (entry.detail.to) return `To ${entry.detail.to.length} person(s)`
  return null
}

export const TaskDetailDrawer = ({ task, onClose, onChanged, onEdit }) => {
  const { columns } = useWorkspace()
  const { can } = usePermissions()
  const { canEditTask } = useAccess()
  const editable = canEditTask(task)

  const history = useAsync(taskService.getTaskHistory, [task?.id], { enabled: Boolean(task) })

  if (!task) return null
  const size = sizeByKey(task.sizeKey)
  const tone = STATUS_TONES[task.statusTone] ?? STATUS_TONES.slate

  const changeStatus = async (statusId) => {
    await taskService.moveTask(task.id, statusId)
    onChanged?.()
  }

  const remove = async () => {
    await taskService.deleteTask(task.id)
    onChanged?.()
    onClose()
  }

  return (
    <Drawer
      anchor="right"
      open
      onClose={onClose}
      aria-label="Task details"
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 460 },
            borderLeft: `3px solid ${tone.strong}`,
            transition: 'border-color 200ms ease',
          },
        },
      }}
    >
      <Box
        sx={{
          bgcolor: tone.tint,
          borderBottom: `1px solid ${tone.border}`,
          transition: 'background-color 200ms ease, border-color 200ms ease',
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', px: 2, pt: 1.5, pb: 1 }}>
          <StatusChip label={task.statusName} tone={task.statusTone} sx={{ minWidth: 0 }} />
          <Box sx={{ flex: 1 }} />
          {editable && can(PERMISSIONS.TASK_UPDATE) ? (
            <IconButton size="small" aria-label="Edit task" onClick={() => onEdit?.(task)} sx={{ color: tone.strong }}>
              <Pencil size={16} strokeWidth={1.75} />
            </IconButton>
          ) : null}
          {editable && can(PERMISSIONS.TASK_DELETE) ? (
            <IconButton size="small" aria-label="Delete task" onClick={remove} sx={{ color: tone.strong }}>
              <Trash2 size={16} strokeWidth={1.75} />
            </IconButton>
          ) : null}
          <IconButton size="small" aria-label="Close" onClick={onClose} sx={{ color: tone.strong }}>
            <X size={16} strokeWidth={1.75} />
          </IconButton>
        </Stack>

        <Box sx={{ px: 2, pb: 2 }}>
          <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', mb: 1.25 }} useFlexGap>
            <ToneChip label={task.clientName} tone={task.clientTone} size="medium" />
            <ToneChip label={task.groupName} tone={task.groupTone} size="medium" />
            <ToneChip label={`${task.points} pts · ${size.key}`} tone="teal" size="medium" />
            <ToneChip label={task.priority} tone={PRIORITY_TONES[task.priority] ?? 'gray'} size="medium" />
          </Stack>

          <Typography variant="h2" component="h2" sx={{ fontSize: '1rem', lineHeight: 1.35 }}>
            {task.title}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ p: 2, overflowY: 'auto' }}>
        {task.recurringId ? (
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: 'center',
              mb: 2,
              px: 1.25,
              py: 0.875,
              borderRadius: 2,
              bgcolor: colors.brandSoft,
              border: `1px solid `,
            }}
          >
            <Repeat size={14} strokeWidth={2} color={colors.brand} aria-hidden="true" />
            <Typography variant="caption" sx={{ flex: 1, color: colors.brandDark }}>
              Created automatically from a recurring task{task.recurringTitle ? `: ` : ''}
            </Typography>
            <Button component={RouterLink} to={ROUTES.recurring} size="small" sx={{ minWidth: 0, px: 0.75 }}>
              Manage
            </Button>
          </Stack>
        ) : null}
        {editable && can(PERMISSIONS.TASK_MOVE) ? (
          <TextField
            select
            size="small"
            label="Status"
            value={task.statusId}
            onChange={(event) => changeStatus(event.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          >
            {columns.map((column) => (
              <MenuItem key={column.id} value={column.id}>
                {column.name}
              </MenuItem>
            ))}
          </TextField>
        ) : null}

        <DefinitionList
          columns={{ xs: 1, sm: 2, lg: 2 }}
          items={[
            { label: 'Team', value: task.teamName },
            {
              label: 'Due',
              value: task.dueDate ? `${formatDate(task.dueDate)} · ${formatRelativeDay(task.dueDate)}` : '—',
            },
            { label: 'Scheduled', value: task.scheduledDate ? formatDate(task.scheduledDate) : '—' },
            { label: 'Completed', value: task.completedAt ? formatDate(task.completedAt) : 'Not yet' },
            { label: 'Created', value: formatDate(task.createdAt) },
            { label: 'Weightage', value: `${task.points} points (${size.label})` },
          ]}
        />

        <Divider sx={{ my: 2.5 }} />

        <Typography variant="subtitle2" component="p" sx={{ mb: 1 }}>
          Assignees
        </Typography>
        <Stack spacing={1} sx={{ mb: 2 }}>
          {task.assignees.map((assignee) => (
            <Stack key={assignee.id} direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
              <UserAvatar name={assignee.fullName} size={28} />
              <Typography variant="body2">{assignee.fullName}</Typography>
            </Stack>
          ))}
        </Stack>

        {task.description ? (
          <>
            <Typography variant="subtitle2" component="p" sx={{ mb: 0.75 }}>
              Description
            </Typography>
            <Box sx={{ bgcolor: colors.page, borderRadius: 2, p: 1.75, mb: 2 }}>
              <Typography variant="body2">{task.description}</Typography>
            </Box>
          </>
        ) : null}

        <Divider sx={{ my: 2.5 }} />

        <TaskAttachments taskId={task.id} canEdit={editable && can(PERMISSIONS.TASK_UPDATE)} />

        <Divider sx={{ my: 2.5 }} />

        <Typography variant="subtitle2" component="p" sx={{ mb: 1.5 }}>
          History
        </Typography>

        <QueryStateView error={history.error} onRetry={history.reload}>
          <Stack component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {(history.data ?? []).map((entry, index, list) => (
              <Box component="li" key={entry.id} sx={{ display: 'flex', gap: 1.5 }}>
                <Stack sx={{ alignItems: 'center', flexShrink: 0 }}>
                  <Box
                    aria-hidden="true"
                    sx={{
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      mt: 0.75,
                      bgcolor: colors.surface,
                      border: `2px solid ${colors.brand}`,
                    }}
                  />
                  {index === list.length - 1 ? null : (
                    <Box aria-hidden="true" sx={{ width: '2px', flex: 1, bgcolor: colors.border }} />
                  )}
                </Stack>
                <Box sx={{ pb: index === list.length - 1 ? 0 : 2.25, minWidth: 0, flex: 1 }}>
                  <Stack direction="row" spacing={0.75} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography variant="body2" fontWeight={600}>
                      {entry.actorName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {entry.summary}
                    </Typography>
                    <ToneChip label={entry.action} tone={ACTION_TONES[entry.action] ?? 'slate'} />
                  </Stack>
                  {describeDetail(entry) ? (
                    <Typography variant="caption" component="p" sx={{ mt: 0.25 }}>
                      {describeDetail(entry)}
                    </Typography>
                  ) : null}
                  <Typography variant="caption" component="p" sx={{ mt: 0.25 }}>
                    {entry.at.replace('T', ' ').slice(0, 16)}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </QueryStateView>
      </Box>

      <Box sx={{ mt: 'auto', p: 2, borderTop: `1px solid ${colors.border}` }}>
        <Button fullWidth variant="outlined" onClick={onClose}>
          Close
        </Button>
      </Box>
    </Drawer>
  )
}
