import { useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { CalendarClock, History, ImagePlus, Sun, X } from 'lucide-react'
import { taskService } from '@/api/taskService'
import { attachmentService } from '@/api/attachmentService'
import { TaskAttachments } from './TaskAttachments'
import { SizePicker } from './SizePicker'
import { isForbidden } from '@/api/httpClient'
import { PRIORITIES, SCHEDULE_MODES, sizeByKey } from '@/constants/workspaceDomain'
import { FEATURES } from '@/constants/features'
import { useFeatures } from '@/hooks/useFeatures'
import { useSubmit } from '@/hooks/useSubmit'
import { useWorkspace } from '@/hooks/useWorkspace'
import { useAccess } from '@/hooks/useAccess'
import { useSession } from '@/hooks/useSession'
import { colors } from '@/theme/tokens'
import { PERMISSIONS } from '@/constants/permissions'
import { usePermissions } from '@/hooks/usePermissions'
import { toIsoDate } from '@/utils/date'

const TODAY = () => toIsoDate(new Date())
const EMPLOYEE_TYPE_ID = 3

const SCHEDULE_TABS = [
  { value: SCHEDULE_MODES.TODAY, label: 'Today', icon: Sun, hint: 'Starts today and lands in To Do straight away.' },
  {
    value: SCHEDULE_MODES.SCHEDULED,
    label: 'Schedule',
    icon: CalendarClock,
    hint: 'Sits in Scheduled until its date, then moves into To Do automatically.',
  },
  {
    value: SCHEDULE_MODES.BACKDATED,
    label: 'Backdate',
    icon: History,
    hint: 'For work already done or started before it was logged.',
  },
]

const validate = (values, mode, { canAssign }) => {
  const errors = {}
  if (!values.title.trim()) errors.title = 'A task title is required.'
  if (!values.clientId) errors.clientId = 'Choose the client this task belongs to.'
  if (!values.groupId) errors.groupId = 'Choose a group.'
  if (!values.statusId) errors.statusId = 'Choose a board column.'
  if (canAssign && values.assigneeIds.length === 0) errors.assigneeIds = 'Assign at least one person.'

  if (mode === SCHEDULE_MODES.SCHEDULED) {
    if (!values.scheduledDate) errors.scheduledDate = 'Pick the date this task should start.'
    else if (values.scheduledDate <= TODAY()) errors.scheduledDate = 'Scheduled tasks must start in the future.'
  }
  if (mode === SCHEDULE_MODES.BACKDATED) {
    if (!values.dueDate) errors.dueDate = 'Pick the original date.'
    else if (values.dueDate >= TODAY()) errors.dueDate = 'A backdated task needs a date in the past.'
  }
  return errors
}

export const TaskFormDialog = ({ open, task, defaultStatusId, defaultGroupId, defaultTeamId, onClose, onSaved }) => {
  const isEditing = Boolean(task)
  const { columns, clients, assignableMembers, activeWorkspaceId } = useWorkspace()
  const { groupOptions, teamOptions: teamOptionsFor, allowsNoTeam, isAdmin } = useAccess()
  const { userType } = useSession()
  const canWriteDescription = userType?.id !== EMPLOYEE_TYPE_ID || isAdmin
  const groups = groupOptions(task?.groupId ?? null)
  const { isEnabled } = useFeatures()
  const weightageOn = isEnabled(FEATURES.WEIGHTAGE)

  const scheduledColumn = columns.find((column) => column.kind === 'scheduled')
  const todoColumn = columns.find((column) => column.kind === 'todo')

  const [mode, setMode] = useState(() => {
    if (!task) return SCHEDULE_MODES.TODAY
    if (task.scheduledDate && task.scheduledDate > TODAY()) return SCHEDULE_MODES.SCHEDULED
    if (task.dueDate && task.dueDate < TODAY()) return SCHEDULE_MODES.BACKDATED
    return SCHEDULE_MODES.TODAY
  })

  const [values, setValues] = useState(() => ({
    title: task?.title ?? '',
    description: task?.description ?? '',
    clientId: task?.clientId ?? '',
    groupId:
      task?.groupId ??
      (groups.some((item) => item.id === defaultGroupId) ? defaultGroupId : groups.length === 1 ? groups[0].id : ''),
    teamId: task?.teamId ?? (groups.some((item) => item.id === defaultGroupId) ? (defaultTeamId ?? '') : ''),
    statusId: task?.statusId ?? defaultStatusId ?? todoColumn?.id ?? '',
    assigneeIds: task?.assigneeIds ?? [],
    priority: task?.priority ?? PRIORITIES.NORMAL,
    sizeKey: task?.sizeKey ?? 'M',
    dueDate: task?.dueDate ?? TODAY(),
    scheduledDate: task?.scheduledDate ?? '',
  }))
  const [errors, setErrors] = useState({})

  const { can } = usePermissions()
  const canAssign = can(PERMISSIONS.TASK_ASSIGN)
  const canSize = can(PERMISSIONS.TASK_WEIGHTAGE_SET)
  const canChangeStatus = !isEditing || can(PERMISSIONS.TASK_MOVE)
  const fileInputRef = useRef(null)
  // Images chosen before the task exists. They upload right after creation,
  // against the new task id, so the form feels like one step.
  const [queued, setQueued] = useState([])
  const [uploadNote, setUploadNote] = useState('')

  const { submit, submitting, error } = useSubmit((payload) =>
    isEditing ? taskService.updateTask(task.id, payload) : taskService.createTask(activeWorkspaceId, payload),
  )

  const teamOptions = useMemo(
    () => (values.groupId ? teamOptionsFor(values.groupId, task?.teamId ?? null) : []),
    [teamOptionsFor, values.groupId, task],
  )
  const noTeamAllowed = allowsNoTeam(values.groupId) || (task && task.groupId === values.groupId && !task.teamId)

  const size = sizeByKey(values.sizeKey)

  const setField = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const changeMode = (nextMode) => {
    setMode(nextMode)
    setErrors({})
    setValues((current) => {
      if (nextMode === SCHEDULE_MODES.TODAY) {
        return {
          ...current,
          dueDate: TODAY(),
          scheduledDate: '',
          statusId: canChangeStatus ? (todoColumn?.id ?? current.statusId) : current.statusId,
        }
      }
      if (nextMode === SCHEDULE_MODES.SCHEDULED) {
        return { ...current, statusId: canChangeStatus ? (scheduledColumn?.id ?? current.statusId) : current.statusId }
      }
      return { ...current, scheduledDate: '' }
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const validationErrors = validate(values, mode, { canAssign })
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    const { assigneeIds, sizeKey, statusId, description, ...rest } = values
    const payload = {
      ...rest,
      ...(canWriteDescription ? { description } : {}),
      ...(canAssign ? { assigneeIds } : {}),
      ...(canSize ? { sizeKey, points: size.points } : {}),
      ...(canChangeStatus ? { statusId } : {}),
      dueDate: mode === SCHEDULE_MODES.SCHEDULED ? values.scheduledDate : values.dueDate,
      scheduledDate: mode === SCHEDULE_MODES.SCHEDULED ? values.scheduledDate : null,
    }

    const saved = await submit(payload)
    if (!saved) return

    if (!isEditing && queued.length > 0) {
      setUploadNote(`Uploading ${queued.length} image${queued.length === 1 ? '' : 's'}…`)
      const failures = []
      for (const file of queued) {
        try {
          await attachmentService.upload({ ownerType: 'task', ownerId: saved.id, file, category: 'reference' })
        } catch {
          failures.push(file.name)
        }
      }
      setUploadNote('')
      if (failures.length > 0) {
        // The task itself saved; only say what did not make it.
        setErrors((current) => ({ ...current, attachments: `Could not upload: ${failures.join(', ')}` }))
        onSaved?.()
        return
      }
    }

    onSaved?.()
    onClose()
  }

  const fieldProps = (field, label, extra = {}) => ({
    label,
    value: values[field] ?? '',
    onChange: setField(field),
    error: Boolean(errors[field]),
    helperText: errors[field] ?? ' ',
    size: 'small',
    fullWidth: true,
    ...extra,
  })

  const activeTab = SCHEDULE_TABS.find((tab) => tab.value === mode)

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="md" fullWidth>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600, pb: 1 }}>
          {isEditing ? 'Edit task' : 'New task'}
        </DialogTitle>

        <Tabs
          value={mode}
          onChange={(_, value) => changeMode(value)}
          aria-label="When does this task happen"
          sx={{ px: 3 }}
        >
          {SCHEDULE_TABS.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              icon={<tab.icon size={15} strokeWidth={1.75} />}
              iconPosition="start"
              sx={{ minHeight: 44 }}
            />
          ))}
        </Tabs>

        <DialogContent dividers>
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {isForbidden(error)
                ? 'You do not have permission to save tasks in this workspace.'
                : (error.message ?? 'The task could not be saved.')}
            </Alert>
          ) : null}

          <Alert severity="info" icon={<activeTab.icon size={17} strokeWidth={1.75} />} sx={{ mb: 2 }}>
            {activeTab.hint}
          </Alert>

          <TextField {...fieldProps('title', 'Task title', { required: true, autoFocus: true })} />

          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
            }}
          >
            <TextField {...fieldProps('clientId', 'Client', { select: true, required: true })}>
              {clients.map((client) => (
                <MenuItem key={client.id} value={client.id}>
                  {client.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              {...fieldProps('groupId', 'Group', { select: true, required: true })}
              onChange={(event) => {
                setValues((current) => ({ ...current, groupId: event.target.value, teamId: '' }))
                setErrors((current) => ({ ...current, groupId: undefined }))
              }}
            >
              {groups.map((group) => (
                <MenuItem key={group.id} value={group.id}>
                  {group.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField {...fieldProps('teamId', 'Team', { select: true })}>
              {noTeamAllowed ? <MenuItem value="">No specific team</MenuItem> : null}
              {teamOptions.map((team) => (
                <MenuItem key={team.id} value={team.id}>
                  {team.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              {...fieldProps('statusId', 'Board column', {
                select: true,
                required: true,
                disabled: !canChangeStatus,
                ...(canChangeStatus ? {} : { helperText: 'Moving tasks is not allowed for your role' }),
              })}
            >
              {columns.map((column) => (
                <MenuItem key={column.id} value={column.id}>
                  {column.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField {...fieldProps('priority', 'Priority', { select: true })}>
              {Object.values(PRIORITIES).map((priority) => (
                <MenuItem key={priority} value={priority}>
                  {priority}
                </MenuItem>
              ))}
            </TextField>

            {mode === SCHEDULE_MODES.SCHEDULED ? (
              <TextField
                {...fieldProps('scheduledDate', 'Scheduled date', {
                  type: 'date',
                  required: true,
                  slotProps: { inputLabel: { shrink: true } },
                })}
              />
            ) : (
              <TextField
                {...fieldProps('dueDate', mode === SCHEDULE_MODES.BACKDATED ? 'Original date' : 'Due date', {
                  type: 'date',
                  required: true,
                  slotProps: { inputLabel: { shrink: true } },
                })}
              />
            )}
          </Box>

          {canAssign ? (
            <TextField
              select
              label="Assignees"
              value={values.assigneeIds}
              onChange={(event) => {
                setValues((current) => ({ ...current, assigneeIds: event.target.value }))
                setErrors((current) => ({ ...current, assigneeIds: undefined }))
              }}
              error={Boolean(errors.assigneeIds)}
              helperText={errors.assigneeIds ?? ' '}
              size="small"
              fullWidth
              required
              slotProps={{ select: { multiple: true } }}
            >
              {assignableMembers.map((member) => (
                <MenuItem key={member.employeeId} value={member.employeeId}>
                  {member.fullName}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              {isEditing ? 'Assignees can only be changed by a lead or admin.' : 'This task will be assigned to you.'}
            </Alert>
          )}

          {weightageOn && canSize ? (
            <SizePicker
              value={values.sizeKey}
              onChange={(sizeKey) => setValues((current) => ({ ...current, sizeKey }))}
              sx={{ mb: 2 }}
            />
          ) : null}

          {isEditing ? (
            <Box sx={{ mb: 2 }}>
              <TaskAttachments taskId={task.id} canEdit={can(PERMISSIONS.TASK_UPDATE)} compact />
            </Box>
          ) : (
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" component="p">
                  Reference images
                  {queued.length > 0 ? (
                    <Typography component="span" variant="caption" sx={{ ml: 0.75 }}>
                      ({queued.length} ready)
                    </Typography>
                  ) : null}
                </Typography>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  hidden
                  onChange={(event) => {
                    setQueued((current) => [...current, ...Array.from(event.target.files ?? [])])
                    event.target.value = ''
                  }}
                  aria-label="Choose reference images"
                />
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ImagePlus size={14} strokeWidth={1.75} />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Add images
                </Button>
              </Stack>
              {errors.attachments ? (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  {errors.attachments}
                </Alert>
              ) : null}
              {uploadNote ? (
                <Typography variant="caption" component="p" sx={{ mb: 1 }}>
                  {uploadNote}
                </Typography>
              ) : null}
              {queued.length > 0 ? (
                <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))' }}>
                  {queued.map((file, index) => (
                    <Box
                      key={`${file.name}-${index}`}
                      sx={{
                        position: 'relative',
                        aspectRatio: '1 / 1',
                        borderRadius: 2,
                        overflow: 'hidden',
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      <Box
                        component="img"
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                      <Box
                        component="button"
                        type="button"
                        aria-label={`Remove ${file.name}`}
                        onClick={() => setQueued((current) => current.filter((_, i) => i !== index))}
                        sx={{
                          position: 'absolute',
                          top: 3,
                          right: 3,
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          border: 0,
                          display: 'grid',
                          placeItems: 'center',
                          cursor: 'pointer',
                          bgcolor: 'rgba(255,255,255,0.92)',
                          color: colors.textPrimary,
                        }}
                      >
                        <X size={12} strokeWidth={2} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="caption" component="p">
                  Mockups, brand references or a brief — they upload as soon as the task is created.
                </Typography>
              )}
            </Box>
          )}

          <TextField
            label="Description"
            value={values.description}
            onChange={setField('description')}
            size="small"
            fullWidth
            multiline
            minRows={3}
            disabled={!canWriteDescription}
            helperText={
              canWriteDescription ? undefined : 'Employees can read the description. Reply in the task comments instead.'
            }
            placeholder="Brief, deliverables, sizes to export…"
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={onClose} variant="outlined" disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Create task'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
