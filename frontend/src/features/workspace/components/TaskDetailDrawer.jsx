import { useRef, useState } from 'react'
import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
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
import { useSession } from '@/hooks/useSession'
import { useWorkspace } from '@/hooks/useWorkspace'
import { TaskAttachments } from './TaskAttachments'
import { TaskDescription } from './TaskDescription'
import { CommentComposer, CommentThread } from './TaskComments'
import { colors } from '@/theme/tokens'
import { formatDate, formatRelativeDay, formatStamp } from '@/utils/date'

const EMPLOYEE_TYPE_ID = 3

const clamp = (lines) => ({
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
})

const ChangeLabel = ({ children }) => (
  <Box
    component="span"
    sx={{
      display: 'block',
      mb: 0.25,
      fontSize: '0.625rem',
      fontWeight: 700,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: colors.textSecondary,
    }}
  >
    {children}
  </Box>
)

const TextChange = ({ before, after }) => (
  <Box
    sx={{
      mt: 0.625,
      px: 1.125,
      py: 0.875,
      borderRadius: 1.5,
      bgcolor: colors.page,
      border: `1px solid ${colors.border}`,
    }}
  >
    {before ? (
      <Box sx={{ mb: after ? 0.75 : 0 }}>
        <ChangeLabel>{after ? 'Before' : 'Removed'}</ChangeLabel>
        <Typography
          variant="caption"
          component="p"
          sx={{ ...clamp(3), color: colors.textSecondary, textDecoration: after ? 'line-through' : 'none' }}
        >
          {before}
        </Typography>
      </Box>
    ) : null}
    {after ? (
      <Box>
        <ChangeLabel>{before ? 'After' : 'Added'}</ChangeLabel>
        <Typography variant="caption" component="p" sx={{ ...clamp(4), color: colors.textPrimary }}>
          {after}
        </Typography>
      </Box>
    ) : null}
  </Box>
)

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
  if (entry.detail.excerpt) return `“${entry.detail.excerpt}”`
  if (entry.detail.from && entry.detail.to) return `${entry.detail.from} → ${entry.detail.to}`
  if (entry.detail.fields) return `Changed: ${entry.detail.fields.join(', ')}`
  if (entry.detail.to) return `To ${entry.detail.to.length} person(s)`
  return null
}

const CountBadge = ({ count, active }) => (
  <Box
    component="span"
    sx={{
      minWidth: 18,
      height: 18,
      px: 0.5,
      display: 'inline-grid',
      placeItems: 'center',
      borderRadius: 999,
      fontSize: '0.6875rem',
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
      bgcolor: active ? colors.brandTint : colors.neutralSoft,
      color: active ? colors.brandDark : colors.textSecondary,
    }}
  >
    {count}
  </Box>
)

const ActivityTimeline = ({ history }) => (
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
            {entry.detail?.before || entry.detail?.after ? (
              <TextChange before={entry.detail.before} after={entry.detail.after} />
            ) : describeDetail(entry) ? (
              <Typography variant="caption" component="p" sx={{ mt: 0.25, overflowWrap: 'anywhere' }}>
                {describeDetail(entry)}
              </Typography>
            ) : null}
            <Typography variant="caption" component="p" sx={{ mt: 0.25 }}>
              {formatStamp(entry.at)}
            </Typography>
          </Box>
        </Box>
      ))}
    </Stack>
  </QueryStateView>
)

export const TaskDetailDrawer = ({ task, onClose, onChanged, onEdit }) => {
  const { columns } = useWorkspace()
  const { can } = usePermissions()
  const { canEditTask, canMoveTask, isAdmin } = useAccess()
  const { user, userType } = useSession()
  const [tab, setTab] = useState('comments')
  const bodyRef = useRef(null)
  const editable = canEditTask(task)

  const history = useAsync(taskService.getTaskHistory, [task?.id], { enabled: Boolean(task), keepPrevious: false })
  const comments = useAsync(taskService.listComments, [task?.id], { enabled: Boolean(task), keepPrevious: false })

  if (!task) return null
  const size = sizeByKey(task.sizeKey)
  const tone = STATUS_TONES[task.statusTone] ?? STATUS_TONES.slate
  const ownTasksOnly = userType?.id === EMPLOYEE_TYPE_ID && !isAdmin
  const canEditDescription = editable && can(PERMISSIONS.TASK_UPDATE) && !ownTasksOnly
  const commentList = comments.data ?? []
  const commentCount = comments.data ? commentList.length : (task.commentCount ?? 0)

  const changeStatus = async (statusId) => {
    await taskService.moveTask(task.id, statusId)
    onChanged?.()
  }

  const remove = async () => {
    await taskService.deleteTask(task.id)
    onChanged?.()
    onClose()
  }

  const afterCommentChange = () => {
    history.reload()
    onChanged?.()
  }

  const sendComment = async (body) => {
    const saved = await taskService.addComment(task.id, body)
    comments.setData([...(comments.data ?? []), saved])
    afterCommentChange()
    requestAnimationFrame(() => {
      const node = bodyRef.current
      if (node) node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
    })
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
            width: { xs: '100%', sm: 480 },
            borderLeft: `3px solid ${tone.strong}`,
            transition: 'border-color 200ms ease',
          },
        },
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
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

      <Box ref={bodyRef} sx={{ flex: 1, minHeight: 0, p: 2, overflowY: 'auto' }}>
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
              border: `1px solid ${colors.brandTintStrong}`,
            }}
          >
            <Repeat size={14} strokeWidth={2} color={colors.brand} aria-hidden="true" />
            <Typography variant="caption" sx={{ flex: 1, color: colors.brandDark }}>
              Created automatically from a recurring task{task.recurringTitle ? `: ${task.recurringTitle}` : ''}
            </Typography>
            <Button component={RouterLink} to={ROUTES.recurring} size="small" sx={{ minWidth: 0, px: 0.75 }}>
              Manage
            </Button>
          </Stack>
        ) : null}

        {canMoveTask(task) && can(PERMISSIONS.TASK_MOVE) ? (
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

        <TaskDescription key={task.id} task={task} canEdit={canEditDescription} onSaved={() => onChanged?.()} />

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
        <Stack spacing={1}>
          {task.assignees.map((assignee) => (
            <Stack key={assignee.id} direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
              <UserAvatar name={assignee.fullName} size={28} />
              <Typography variant="body2">{assignee.fullName}</Typography>
            </Stack>
          ))}
        </Stack>

        <Divider sx={{ my: 2.5 }} />

        <TaskAttachments taskId={task.id} canEdit={editable && can(PERMISSIONS.TASK_UPDATE)} />

        <Divider sx={{ mt: 2.5 }} />

        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          aria-label="Comments and activity"
          sx={{ minHeight: 42, mb: 2, '& .MuiTab-root': { minHeight: 42, px: 1.5, minWidth: 0 } }}
        >
          <Tab
            value="comments"
            label={
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                <span>Comments</span>
                <CountBadge count={commentCount} active={tab === 'comments'} />
              </Stack>
            }
          />
          <Tab value="activity" label="Activity" />
        </Tabs>

        {tab === 'comments' ? (
          <CommentThread
            comments={comments.data}
            loading={comments.loading}
            error={comments.error}
            onRetry={comments.reload}
            currentUserId={user?.id}
            isAdmin={isAdmin}
            onUpdated={(updated) => {
              comments.setData(commentList.map((comment) => (comment.id === updated.id ? updated : comment)))
              history.reload()
            }}
            onDeleted={(commentId) => {
              comments.setData(commentList.filter((comment) => comment.id !== commentId))
              afterCommentChange()
            }}
          />
        ) : (
          <ActivityTimeline history={history} />
        )}
      </Box>

      {tab === 'comments' ? <CommentComposer onSend={sendComment} /> : null}
    </Drawer>
  )
}
