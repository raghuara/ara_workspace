import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Button,
  Divider,
  IconButton,
  InputBase,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Popover,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { keyframes } from '@mui/material/styles'
import {
  AlignLeft,
  CalendarDays,
  Check,
  CornerDownLeft,
  Flag,
  Gauge,
  ImagePlus,
  Layers,
  Tag,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'
import { ToneChip } from '@/components/ToneChip'
import { UserAvatar } from '@/components/UserAvatar'
import { attachmentService } from '@/api/attachmentService'
import { taskService } from '@/api/taskService'
import { PRIORITIES, PRIORITY_TONES, STATUS_TONES, TASK_SIZES, sizeByKey } from '@/constants/workspaceDomain'
import { FEATURES } from '@/constants/features'
import { useFeatures } from '@/hooks/useFeatures'
import { usePermissions } from '@/hooks/usePermissions'
import { PERMISSIONS } from '@/constants/permissions'
import { useWorkspace } from '@/hooks/useWorkspace'
import { useAccess } from '@/hooks/useAccess'
import { useSession } from '@/hooks/useSession'
import { colors } from '@/theme/tokens'
import { daysFromNow, formatRelativeDay, toIsoDate } from '@/utils/date'

const pop = keyframes`
  from { opacity: 0; transform: translateY(-4px) scale(0.98); }
  to { opacity: 1; transform: none; }
`

const stop = (event) => event.stopPropagation()

const EMPLOYEE_TYPE_ID = 3

const QuickRow = ({ icon: Icon, label, filled, required, missing, onClick, readOnly = false, children }) => (
  <Box
    component={readOnly ? 'div' : 'button'}
    type={readOnly ? undefined : 'button'}
    onClick={readOnly ? undefined : onClick}
    aria-disabled={readOnly || undefined}
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.25,
      width: '100%',
      minHeight: 32,
      px: 1,
      borderRadius: 1.5,
      border: 0,
      bgcolor: 'transparent',
      cursor: readOnly ? 'default' : 'pointer',
      textAlign: 'left',
      font: 'inherit',
      color: filled ? colors.textPrimary : colors.textSecondary,
      '&:hover': readOnly ? {} : { bgcolor: colors.neutralSoft },
      '&:focus-visible': { outline: 'none', boxShadow: `inset 0 0 0 2px ${colors.brand}` },
    }}
  >
    <Box sx={{ display: 'inline-flex', flexShrink: 0, color: missing ? STATUS_TONES.rose.strong : 'inherit' }}>
      <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
    </Box>
    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
      {children ?? <Typography variant="body2">{label}</Typography>}
    </Box>
    {required && !filled ? (
      <Box
        aria-hidden="true"
        sx={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          flexShrink: 0,
          bgcolor: missing ? STATUS_TONES.rose.strong : colors.border,
        }}
      />
    ) : null}
  </Box>
)

export const QuickAddCard = ({ column, task = null, defaultGroupId, defaultTeamId, onCancel, onCreated, onSaved }) => {
  const { activeWorkspaceId, clients, assignableMembers } = useWorkspace()
  const { groupOptions, teamOptions: teamOptionsFor, allowsNoTeam, isAdmin } = useAccess()
  const groups = groupOptions(task?.groupId ?? null)
  const { isEnabled } = useFeatures()
  const { can } = usePermissions()
  const { userType } = useSession()
  const canAssign = can(PERMISSIONS.TASK_ASSIGN)
  const canSize = can(PERMISSIONS.TASK_WEIGHTAGE_SET)
  const canWriteDescription = (userType?.id !== EMPLOYEE_TYPE_ID || isAdmin) && can(PERMISSIONS.TASK_UPDATE)
  const canAttach = can(PERMISSIONS.TASK_UPDATE)
  const weightageOn = isEnabled(FEATURES.WEIGHTAGE)
  const scheduled = column.kind === 'scheduled'
  const isEditing = Boolean(task)

  const [title, setTitle] = useState(task?.title ?? '')
  const [values, setValues] = useState({
    clientId: task?.clientId ?? '',
    groupId:
      task?.groupId ??
      (groups.some((item) => item.id === defaultGroupId) ? defaultGroupId : groups.length === 1 ? groups[0].id : ''),
    teamId: task?.teamId ?? (groups.some((item) => item.id === defaultGroupId) ? (defaultTeamId ?? '') : ''),
    assigneeIds: task?.assigneeIds ?? [],
    priority: task?.priority ?? PRIORITIES.NORMAL,
    sizeKey: task?.sizeKey ?? 'M',
    dueDate: task ? (task.scheduledDate ?? task.dueDate ?? '') : scheduled ? daysFromNow(1) : toIsoDate(new Date()),
  })
  const [description, setDescription] = useState(task?.description ?? '')
  const [showDescription, setShowDescription] = useState(Boolean(task?.description))
  const [queued, setQueued] = useState([])
  const [note, setNote] = useState('')
  const [menu, setMenu] = useState(null)
  const [missing, setMissing] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape' && !menu) onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [menu, onCancel])

  const set = (patch) => {
    setValues((current) => ({ ...current, ...patch }))
    setMissing((current) => {
      const next = { ...current }
      Object.keys(patch).forEach((key) => delete next[key])
      return next
    })
  }

  const openMenu = (kind) => (event) => setMenu({ kind, anchor: event.currentTarget })
  const closeMenu = () => setMenu(null)

  const group = groups.find((item) => item.id === values.groupId)
  const teamOptions = values.groupId ? teamOptionsFor(values.groupId, task?.teamId ?? null) : []
  const noTeamAllowed = allowsNoTeam(values.groupId) || (task && task.groupId === values.groupId && !task.teamId)
  const team = teamOptions.find((item) => item.id === values.teamId)
  const client = clients.find((item) => item.id === values.clientId)
  const assignees = assignableMembers.filter((member) => values.assigneeIds.includes(member.employeeId))
  const size = sizeByKey(values.sizeKey)
  const priorityTone = STATUS_TONES[PRIORITY_TONES[values.priority] ?? 'gray']

  const addFiles = async (list) => {
    const files = Array.from(list ?? [])
    if (files.length === 0) return
    setError(null)
    if (!isEditing) {
      setQueued((current) => [...current, ...files])
      return
    }
    setNote(`Uploading ${files.length} image${files.length === 1 ? '' : 's'}…`)
    const failed = []
    for (const file of files) {
      try {
        await attachmentService.upload({ ownerType: 'task', ownerId: task.id, file, category: 'reference' })
      } catch {
        failed.push(file.name)
      }
    }
    const added = files.length - failed.length
    setNote(added > 0 ? `${added} image${added === 1 ? '' : 's'} added` : '')
    if (failed.length > 0) setError(`Could not upload: ${failed.join(', ')}`)
  }

  const save = async () => {
    const problems = {}
    if (!title.trim()) problems.title = true
    if (!values.clientId) problems.clientId = true
    if (!values.groupId) problems.groupId = true
    if (canAssign && values.assigneeIds.length === 0) problems.assigneeIds = true
    setMissing(problems)
    if (Object.keys(problems).length > 0) {
      if (problems.title) inputRef.current?.focus()
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        title: title.trim(),
        clientId: values.clientId,
        groupId: values.groupId,
        teamId: values.teamId || null,
        ...(canAssign ? { assigneeIds: values.assigneeIds } : {}),
        priority: values.priority,
        ...(canSize ? { sizeKey: values.sizeKey, points: size.points } : {}),
        ...(canWriteDescription ? { description: description.trim() } : {}),
        dueDate: values.dueDate || toIsoDate(new Date()),
        scheduledDate: scheduled ? values.dueDate || daysFromNow(1) : null,
      }
      if (isEditing) {
        const saved = await taskService.updateTask(task.id, payload)
        onSaved?.(saved)
      } else {
        const saved = await taskService.createTask(activeWorkspaceId, { ...payload, statusId: column.id })
        if (queued.length > 0) {
          setNote(`Uploading ${queued.length} image${queued.length === 1 ? '' : 's'}…`)
          const failed = []
          for (const file of queued) {
            try {
              await attachmentService.upload({ ownerType: 'task', ownerId: saved.id, file, category: 'reference' })
            } catch {
              failed.push(file.name)
            }
          }
          setNote('')
          if (failed.length > 0) setError(`Task created, but these images did not upload: ${failed.join(', ')}`)
        }
        onCreated?.(saved)
      }
    } catch (caught) {
      setError(caught?.message ?? (isEditing ? 'The task could not be saved.' : 'The task could not be created.'))
    } finally {
      setSubmitting(false)
    }
  }

  const missingLabels = [
    missing.clientId && 'a client',
    missing.groupId && 'a group',
    missing.assigneeIds && 'an assignee',
  ].filter(Boolean)

  return (
    <Box
      onClick={stop}
      onPointerDown={stop}
      sx={{
        bgcolor: colors.surface,
        border: `1px solid ${colors.brand}`,
        borderRadius: 2,
        boxShadow: '0 8px 24px rgba(37, 99, 235, 0.16), 0 1px 2px rgba(15, 23, 42, 0.06)',
        p: 1,
        animation: `${pop} 160ms cubic-bezier(0.2, 0.8, 0.2, 1)`,
      }}
    >
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', px: 0.5, pb: 0.75 }}>
        <InputBase
          inputRef={inputRef}
          autoFocus
          value={title}
          placeholder="Task name…"
          aria-label="Task name"
          onChange={(event) => {
            setTitle(event.target.value)
            setMissing((current) => ({ ...current, title: false }))
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              save()
            }
          }}
          sx={{
            flex: 1,
            fontSize: '0.875rem',
            fontWeight: 600,
            '& input::placeholder': {
              color: missing.title ? STATUS_TONES.rose.strong : colors.textSecondary,
              opacity: 1,
            },
          }}
        />
        <Button
          size="small"
          variant="contained"
          onClick={save}
          disabled={submitting || !title.trim()}
          endIcon={<CornerDownLeft size={13} strokeWidth={2} />}
          sx={{ flexShrink: 0, minHeight: 28, px: 1.25 }}
        >
          {submitting ? 'Saving…' : 'Save'}
        </Button>
        <IconButton size="small" aria-label="Cancel" onClick={onCancel} sx={{ flexShrink: 0 }}>
          <X size={14} strokeWidth={2} />
        </IconButton>
      </Stack>

      <Stack spacing={0.125}>
        {canAssign ? (
          <QuickRow
            icon={UserRound}
            label="Add assignee"
            required
            filled={assignees.length > 0}
            missing={missing.assigneeIds}
            onClick={openMenu('assignee')}
          >
            {assignees.length > 0 ? (
              <>
                <Stack direction="row" sx={{ mr: 0.25 }}>
                  {assignees.slice(0, 3).map((member, index) => (
                    <Box key={member.employeeId} sx={{ ml: index === 0 ? 0 : -0.5 }}>
                      <UserAvatar name={member.fullName} size={20} />
                    </Box>
                  ))}
                </Stack>
                <Typography variant="body2" noWrap>
                  {assignees.map((member) => member.fullName.split(' ')[0]).join(', ')}
                </Typography>
              </>
            ) : null}
          </QuickRow>
        ) : null}

        <QuickRow icon={CalendarDays} label="Add dates" filled={Boolean(values.dueDate)} onClick={openMenu('date')}>
          {values.dueDate ? (
            <Typography variant="body2">
              {scheduled ? 'Starts ' : 'Due '}
              {formatRelativeDay(values.dueDate)}
            </Typography>
          ) : null}
        </QuickRow>

        <QuickRow icon={Flag} label="Add priority" filled onClick={openMenu('priority')}>
          <Stack direction="row" spacing={0.625} sx={{ alignItems: 'center' }}>
            <Flag size={13} strokeWidth={2} color={priorityTone.strong} aria-hidden="true" />
            <Typography variant="body2">{values.priority}</Typography>
          </Stack>
        </QuickRow>

        <QuickRow
          icon={Tag}
          label="Add client"
          required
          filled={Boolean(client)}
          missing={missing.clientId}
          onClick={openMenu('client')}
        >
          {client ? <ToneChip label={client.name} tone={client.tone} /> : null}
        </QuickRow>

        {!defaultGroupId ? (
          <QuickRow
            icon={Layers}
            label="Add group"
            required
            filled={Boolean(group)}
            missing={missing.groupId}
            onClick={openMenu('group')}
          >
            {group ? <ToneChip label={group.name} tone={group.tone} /> : null}
          </QuickRow>
        ) : null}

        {!defaultTeamId && teamOptions.length > 0 ? (
          <QuickRow icon={UsersRound} label="Add team" filled={Boolean(team)} onClick={openMenu('team')}>
            {team ? <Typography variant="body2">{team.name}</Typography> : null}
          </QuickRow>
        ) : null}

        {weightageOn ? (
          <QuickRow icon={Gauge} label="Add size" filled readOnly={!canSize} onClick={openMenu('size')}>
            <Typography variant="body2">
              {size.label} · {size.points} pts
            </Typography>
          </QuickRow>
        ) : null}

        {canWriteDescription && !showDescription ? (
          <QuickRow
            icon={AlignLeft}
            label="Add description"
            filled={Boolean(description.trim())}
            onClick={() => setShowDescription(true)}
          >
            {description.trim() ? (
              <Typography variant="body2" noWrap>
                {description.trim()}
              </Typography>
            ) : null}
          </QuickRow>
        ) : null}

        {canAttach ? (
          <QuickRow
            icon={ImagePlus}
            label={isEditing ? 'Add images' : 'Add reference images'}
            filled={queued.length > 0}
            onClick={() => fileRef.current?.click()}
          >
            {queued.length > 0 ? (
              <Typography variant="body2">
                {queued.length} image{queued.length === 1 ? '' : 's'} ready
              </Typography>
            ) : null}
          </QuickRow>
        ) : null}
      </Stack>

      {canWriteDescription && showDescription ? (
        <TextField
          autoFocus
          multiline
          minRows={2}
          maxRows={6}
          size="small"
          fullWidth
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What needs to be done, links, references…"
          sx={{ mt: 0.75, '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
        />
      ) : null}

      {canAttach ? (
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
          multiple
          hidden
          aria-label="Choose reference images"
          onChange={(event) => {
            addFiles(event.target.files)
            event.target.value = ''
          }}
        />
      ) : null}

      {queued.length > 0 ? (
        <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap', mt: 0.75, px: 0.5 }}>
          {queued.map((file, index) => (
            <Box
              key={`${file.name}-${index}`}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.375,
                maxWidth: '100%',
                px: 0.75,
                py: 0.125,
                borderRadius: 1.5,
                bgcolor: colors.brandSoft,
                border: `1px solid ${STATUS_TONES.blue.border}`,
                color: colors.brandDark,
                fontSize: '0.6875rem',
                fontWeight: 600,
              }}
            >
              <Box component="span" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file.name}
              </Box>
              <Box
                component="button"
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() => setQueued((current) => current.filter((_, position) => position !== index))}
                sx={{
                  display: 'inline-flex',
                  border: 0,
                  p: 0,
                  bgcolor: 'transparent',
                  color: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <X size={11} strokeWidth={2.5} aria-hidden="true" />
              </Box>
            </Box>
          ))}
        </Stack>
      ) : null}

      {note ? (
        <Typography variant="caption" component="p" sx={{ mt: 0.75, px: 1, color: colors.textSecondary }}>
          {note}
        </Typography>
      ) : null}

      {missingLabels.length > 0 || error ? (
        <Typography variant="caption" component="p" sx={{ mt: 0.75, px: 1, color: STATUS_TONES.rose.strong }}>
          {error ?? `Add ${missingLabels.join(', ')} to save.`}
        </Typography>
      ) : null}

      <Menu
        anchorEl={menu?.anchor ?? null}
        open={Boolean(menu) && menu.kind !== 'date'}
        onClose={closeMenu}
        onClick={stop}
        onPointerDown={stop}
        slotProps={{ paper: { sx: { minWidth: 220, maxHeight: 320 } } }}
      >
        {menu?.kind === 'assignee'
          ? assignableMembers.map((member) => {
              const selected = values.assigneeIds.includes(member.employeeId)
              return (
                <MenuItem
                  key={member.employeeId}
                  selected={selected}
                  onClick={() =>
                    set({
                      assigneeIds: selected
                        ? values.assigneeIds.filter((id) => id !== member.employeeId)
                        : [...values.assigneeIds, member.employeeId],
                    })
                  }
                >
                  <ListItemIcon>
                    <UserAvatar name={member.fullName} size={24} />
                  </ListItemIcon>
                  <ListItemText
                    primary={member.fullName}
                    secondary={member.designation}
                    slotProps={{ primary: { fontSize: '0.8125rem' }, secondary: { fontSize: '0.75rem' } }}
                  />
                  {selected ? <Check size={15} strokeWidth={2} color={colors.brand} aria-hidden="true" /> : null}
                </MenuItem>
              )
            })
          : null}

        {menu?.kind === 'priority'
          ? Object.values(PRIORITIES).map((priority) => (
              <MenuItem
                key={priority}
                selected={priority === values.priority}
                onClick={() => {
                  set({ priority })
                  closeMenu()
                }}
              >
                <ListItemIcon>
                  <Flag
                    size={14}
                    strokeWidth={2}
                    color={STATUS_TONES[PRIORITY_TONES[priority]].strong}
                    aria-hidden="true"
                  />
                </ListItemIcon>
                <ListItemText primary={priority} slotProps={{ primary: { fontSize: '0.8125rem' } }} />
              </MenuItem>
            ))
          : null}

        {menu?.kind === 'client'
          ? clients.map((item) => (
              <MenuItem
                key={item.id}
                selected={item.id === values.clientId}
                onClick={() => {
                  set({ clientId: item.id })
                  closeMenu()
                }}
              >
                <ToneChip label={item.name} tone={item.tone} />
              </MenuItem>
            ))
          : null}

        {menu?.kind === 'group'
          ? groups.map((item) => (
              <MenuItem
                key={item.id}
                selected={item.id === values.groupId}
                onClick={() => {
                  set({ groupId: item.id, teamId: '' })
                  closeMenu()
                }}
              >
                <ListItemIcon>
                  <Box
                    sx={{
                      width: 9,
                      height: 9,
                      borderRadius: '3px',
                      bgcolor: (STATUS_TONES[item.tone] ?? STATUS_TONES.slate).strong,
                    }}
                  />
                </ListItemIcon>
                <ListItemText primary={item.name} slotProps={{ primary: { fontSize: '0.8125rem' } }} />
              </MenuItem>
            ))
          : null}

        {menu?.kind === 'team'
          ? [
              noTeamAllowed ? (
                <MenuItem
                  key="none"
                  selected={!values.teamId}
                  onClick={() => {
                    set({ teamId: '' })
                    closeMenu()
                  }}
                >
                  <ListItemText
                    primary="No team"
                    slotProps={{ primary: { fontSize: '0.8125rem', color: colors.textSecondary } }}
                  />
                </MenuItem>
              ) : null,
              noTeamAllowed ? <Divider key="divider" /> : null,
              ...teamOptions.map((item) => (
                <MenuItem
                  key={item.id}
                  selected={item.id === values.teamId}
                  onClick={() => {
                    set({ teamId: item.id })
                    closeMenu()
                  }}
                >
                  <ListItemText primary={item.name} slotProps={{ primary: { fontSize: '0.8125rem' } }} />
                </MenuItem>
              )),
            ]
          : null}

        {menu?.kind === 'size'
          ? TASK_SIZES.map((item) => (
              <MenuItem
                key={item.key}
                selected={item.key === values.sizeKey}
                onClick={() => {
                  set({ sizeKey: item.key })
                  closeMenu()
                }}
              >
                <ListItemText
                  primary={`${item.key} · ${item.label} · ${item.points} pts`}
                  secondary={item.guide}
                  slotProps={{ primary: { fontSize: '0.8125rem' }, secondary: { fontSize: '0.75rem' } }}
                />
              </MenuItem>
            ))
          : null}
      </Menu>

      <Popover
        anchorEl={menu?.anchor ?? null}
        open={Boolean(menu) && menu.kind === 'date'}
        onClose={closeMenu}
        onClick={stop}
        onPointerDown={stop}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { p: 1.5, width: 260 } } }}
      >
        <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', mb: 1.25 }}>
          {[
            { label: 'Today', value: toIsoDate(new Date()) },
            { label: 'Tomorrow', value: daysFromNow(1) },
            { label: 'Next week', value: daysFromNow(7) },
          ].map((option) => (
            <Button
              key={option.label}
              size="small"
              variant={values.dueDate === option.value ? 'contained' : 'outlined'}
              onClick={() => {
                set({ dueDate: option.value })
                closeMenu()
              }}
            >
              {option.label}
            </Button>
          ))}
        </Stack>
        <TextField
          type="date"
          size="small"
          fullWidth
          label={scheduled ? 'Start date' : 'Due date'}
          value={values.dueDate}
          onChange={(event) => set({ dueDate: event.target.value })}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Popover>
    </Box>
  )
}
