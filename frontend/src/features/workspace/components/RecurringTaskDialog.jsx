import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { Repeat } from 'lucide-react'
import { recurringTaskService } from '@/api/recurringTaskService'
import { isForbidden } from '@/api/httpClient'
import { PRIORITIES, RECURRENCE, sizeByKey } from '@/constants/workspaceDomain'
import { FEATURES } from '@/constants/features'
import { useFeatures } from '@/hooks/useFeatures'
import { useSubmit } from '@/hooks/useSubmit'
import { useWorkspace } from '@/hooks/useWorkspace'
import { colors } from '@/theme/tokens'
import { isScheduleComplete, normaliseSchedule, todayIso } from '@/utils/recurrence'
import { SchedulePicker } from './SchedulePicker'
import { SizePicker } from './SizePicker'

const Section = ({ step, title, hint, children }) => (
  <Box sx={{ mb: 2.5 }}>
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.25 }}>
      <Box
        aria-hidden="true"
        sx={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: colors.brandSoft,
          color: colors.brandDark,
          fontSize: '0.75rem',
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {step}
      </Box>
      <Box>
        <Typography variant="subtitle2" component="h3">
          {title}
        </Typography>
        {hint ? (
          <Typography variant="caption" component="p">
            {hint}
          </Typography>
        ) : null}
      </Box>
    </Stack>
    {children}
  </Box>
)

const validate = (values) => {
  const errors = {}
  if (!values.title.trim()) errors.title = 'Give the task a title.'
  if (!values.clientId) errors.clientId = 'Choose the client this task belongs to.'
  if (!values.groupId) errors.groupId = 'Choose a group.'
  if (values.assigneeIds.length === 0) errors.assigneeIds = 'Assign at least one person.'
  if (!isScheduleComplete(values.schedule)) {
    errors.schedule =
      values.schedule.frequency === RECURRENCE.MONTHLY ? 'Pick at least one date of the month.' : 'Pick at least one day of the week.'
  }
  if (!values.startDate) errors.startDate = 'Pick a start date.'
  if (values.endDate && values.startDate && values.endDate < values.startDate) errors.endDate = 'The end date must be after the start.'
  return errors
}

export const RecurringTaskDialog = ({ rule, defaultGroupId, defaultTeamId, onClose, onSaved }) => {
  const isEditing = Boolean(rule)
  const { groups, teams, clients, assignableMembers, activeWorkspaceId } = useWorkspace()
  const { isEnabled } = useFeatures()
  const weightageOn = isEnabled(FEATURES.WEIGHTAGE)

  const [values, setValues] = useState(() => ({
    title: rule?.title ?? '',
    description: rule?.description ?? '',
    clientId: rule?.clientId ?? '',
    groupId: rule?.groupId ?? defaultGroupId ?? '',
    teamId: rule?.teamId ?? defaultTeamId ?? '',
    priority: rule?.priority ?? PRIORITIES.NORMAL,
    sizeKey: rule?.sizeKey ?? 'M',
    assigneeIds: rule?.assigneeIds ?? [],
    perAssignee: rule?.perAssignee ?? false,
    schedule: normaliseSchedule(rule?.schedule ?? { frequency: RECURRENCE.WEEKLY, weekdays: [1, 2, 3, 4, 5] }),
    dueOffsetDays: rule?.dueOffsetDays ?? 0,
    startDate: rule?.startDate ?? todayIso(),
    endDate: rule?.endDate ?? '',
  }))
  const [errors, setErrors] = useState({})

  const { submit, submitting, error } = useSubmit((payload) =>
    isEditing ? recurringTaskService.update(rule.id, payload) : recurringTaskService.create(activeWorkspaceId, payload),
  )

  const teamOptions = useMemo(
    () => (values.groupId ? teams.filter((team) => team.groupId === values.groupId) : teams),
    [teams, values.groupId],
  )

  const setField = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
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

  const handleSubmit = async (event) => {
    event.preventDefault()
    const validationErrors = validate(values)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    const saved = await submit({
      title: values.title.trim(),
      description: values.description,
      clientId: values.clientId,
      groupId: values.groupId,
      teamId: values.teamId || null,
      priority: values.priority,
      sizeKey: values.sizeKey,
      points: sizeByKey(values.sizeKey).points,
      assigneeIds: values.assigneeIds,
      perAssignee: values.perAssignee,
      schedule: normaliseSchedule(values.schedule),
      dueOffsetDays: values.dueOffsetDays,
      startDate: values.startDate,
      endDate: values.endDate || null,
    })
    if (!saved) return
    onSaved?.(saved)
    onClose()
  }

  const peopleCount = values.assigneeIds.length

  return (
    <Dialog open onClose={submitting ? undefined : onClose} maxWidth="md" fullWidth>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600, pb: 1 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Repeat size={17} strokeWidth={2} color={colors.brand} aria-hidden="true" />
            <span>{isEditing ? 'Edit recurring task' : 'New recurring task'}</span>
          </Stack>
          <Typography variant="caption" component="p" sx={{ fontWeight: 400, mt: 0.25 }}>
            Set it up once. On every scheduled day a fresh copy lands in To Do for the people you choose.
          </Typography>
        </DialogTitle>

        <DialogContent dividers>
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {isForbidden(error) ? 'You do not have permission to manage recurring tasks here.' : (error.message ?? 'The recurring task could not be saved.')}
            </Alert>
          ) : null}

          <Section step={1} title="What needs doing" hint="This is the task that will be created each time.">
            <TextField {...fieldProps('title', 'Task title', { required: true, autoFocus: !isEditing, placeholder: 'e.g. Post the daily social media update' })} />
            <TextField {...fieldProps('description', 'Description', { multiline: true, minRows: 2, placeholder: 'Checklist, links, or anything the person needs each time' })} />
            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' } }}>
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
                <MenuItem value="">No specific team</MenuItem>
                {teamOptions.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name}
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
            </Box>
            {weightageOn ? (
              <SizePicker value={values.sizeKey} onChange={(sizeKey) => setValues((current) => ({ ...current, sizeKey }))} />
            ) : null}
          </Section>

          <Section step={2} title="Who does it" hint="Everyone here gets the task on each scheduled day.">
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
            <Box sx={{ px: 1.5, py: 1, borderRadius: 2, border: `1px solid ${colors.border}`, bgcolor: colors.page }}>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={values.perAssignee}
                    onChange={(event) => setValues((current) => ({ ...current, perAssignee: event.target.checked }))}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      Separate task for each person
                    </Typography>
                    <Typography variant="caption" component="p">
                      {values.perAssignee
                        ? `${peopleCount || 'Each'} ${peopleCount === 1 ? 'task is' : 'tasks are'} created each time — one per person, so everyone tracks their own.`
                        : 'One shared task is created each time, with everyone assigned to it.'}
                    </Typography>
                  </Box>
                }
                sx={{ m: 0, alignItems: 'flex-start', gap: 1 }}
              />
            </Box>
          </Section>

          <Section step={3} title="When it repeats" hint="Choose the days of the week, or fixed dates each month.">
            <SchedulePicker
              value={{ schedule: values.schedule, dueOffsetDays: values.dueOffsetDays, startDate: values.startDate, endDate: values.endDate }}
              onChange={(next) => {
                setValues((current) => ({ ...current, ...next }))
                setErrors((current) => ({ ...current, schedule: undefined, startDate: undefined, endDate: undefined }))
              }}
              errors={errors}
            />
          </Section>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={submitting} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Create recurring task'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
