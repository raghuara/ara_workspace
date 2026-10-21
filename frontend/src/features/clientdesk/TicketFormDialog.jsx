import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ListSubheader,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Link } from 'react-router-dom'
import { Info } from 'lucide-react'
import { TaskAttachments } from '@/features/workspace/components/TaskAttachments'
import { ToneChip } from '@/components/ToneChip'
import { ticketService } from '@/api/ticketService'
import { isForbidden } from '@/api/httpClient'
import { PERMISSIONS } from '@/constants/permissions'
import { ROUTES } from '@/constants/routes'
import { TICKET_KINDS } from '@/constants/clientDesk'
import { PRIORITIES } from '@/constants/workspaceDomain'
import { useSubmit } from '@/hooks/useSubmit'
import { usePermissions } from '@/hooks/usePermissions'
import { useWorkspace } from '@/hooks/useWorkspace'
import { colors } from '@/theme/tokens'
import { toIsoDate } from '@/utils/date'

const TODAY = () => toIsoDate(new Date())

const inDays = (days) => {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return toIsoDate(date)
}

export const TicketFormDialog = ({ ticket, clients, defaultClientId, onClose, onSaved }) => {
  const isEditing = Boolean(ticket)
  const { activeWorkspaceId, assignableMembers } = useWorkspace()
  const { can } = usePermissions()
  const canAssignAnyone = can(PERMISSIONS.TICKET_MANAGE_ALL)

  const [values, setValues] = useState(() => ({
    clientId: ticket?.clientId ?? defaultClientId ?? '',
    kind: ticket?.kind ?? 'Requirement',
    title: ticket?.title ?? '',
    description: ticket?.description ?? '',
    priority: ticket?.priority ?? 'Normal',
    collectedOn: ticket?.collectedOn ?? TODAY(),
    dueDate: ticket?.dueDate ?? inDays(3),
    ownerId: ticket?.ownerId ?? '',
  }))
  const [errors, setErrors] = useState({})

  const { submit, submitting, error } = useSubmit((payload) =>
    isEditing ? ticketService.updateTicket(ticket.id, payload) : ticketService.createTicket(payload),
  )

  const setField = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const chosenClient = clients.find((client) => client.id === values.clientId) ?? null
  const followers = chosenClient?.assignees ?? []

  // A ticket has to land on somebody, so a client nobody handles is not offered.
  const selectable = clients.filter((client) => (client.assignees ?? []).length > 0 || client.id === ticket?.clientId)
  const hiddenCount = clients.length - selectable.length

  // Choosing a client hands the ticket to whoever follows that client. Anyone
  // who may change it can still pick someone else below.
  const chooseClient = (event) => {
    const clientId = event.target.value
    const next = clients.find((client) => client.id === clientId)
    const suggested = next?.assignees?.[0]?.id ?? ''
    setValues((current) => ({ ...current, clientId, ownerId: suggested || current.ownerId }))
    setErrors((current) => ({ ...current, clientId: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const next = {}
    if (!values.clientId) next.clientId = 'Choose the client this came from.'
    if (!values.title.trim()) next.title = 'A short heading is required.'
    if (values.dueDate && values.collectedOn && values.dueDate < values.collectedOn) {
      next.dueDate = 'The due date cannot be before the collected date.'
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return

    const saved = await submit({ ...values, workspaceId: activeWorkspaceId })
    if (saved) {
      onSaved(saved)
      onClose()
    }
  }

  return (
    <Dialog open onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600 }}>
          {isEditing ? `Edit ${ticket.token}` : 'New ticket'}
        </DialogTitle>

        <DialogContent dividers>
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {isForbidden(error) ? error.message : (error.message ?? 'The ticket could not be saved.')}
            </Alert>
          ) : null}

          <Stack spacing={1.5}>
            {hiddenCount > 0 ? (
              <Alert
                severity="info"
                icon={<Info size={16} strokeWidth={2} />}
                action={
                  <Button component={Link} to={ROUTES.clients} size="small" onClick={onClose}>
                    Clients
                  </Button>
                }
              >
                {hiddenCount === 1 ? 'One client is' : `${hiddenCount} clients are`} not listed because nobody handles
                {hiddenCount === 1 ? ' them' : ' them'} yet. Pick who handles them on the Clients page first.
              </Alert>
            ) : null}

            <TextField
              select
              size="small"
              label="Client"
              value={values.clientId}
              onChange={chooseClient}
              error={Boolean(errors.clientId)}
              helperText={errors.clientId ?? (canAssignAnyone ? 'Every client someone handles.' : 'The clients assigned to you.')}
              fullWidth
              required
            >
              {selectable.map((client) => (
                <MenuItem key={client.id} value={client.id}>
                  {client.name}
                  {client.company ? ` · ${client.company}` : ''}
                </MenuItem>
              ))}
            </TextField>

            <Box>
              <Typography variant="caption" component="p" sx={{ mb: 0.75, color: colors.textSecondary }}>
                What is it?
              </Typography>
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
                {TICKET_KINDS.map((kind) => {
                  const selected = values.kind === kind.value
                  return (
                    <Box
                      key={kind.value}
                      component="button"
                      type="button"
                      onClick={() => setValues((current) => ({ ...current, kind: kind.value }))}
                      aria-pressed={selected}
                      title={kind.hint}
                      sx={{
                        height: 30,
                        px: 1.25,
                        border: `1px solid ${selected ? colors.brand : colors.border}`,
                        borderRadius: 999,
                        bgcolor: selected ? colors.brand : colors.surface,
                        color: selected ? '#FFFFFF' : colors.textPrimary,
                        font: 'inherit',
                        fontSize: '0.75rem',
                        fontWeight: selected ? 650 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      {kind.label}
                    </Box>
                  )
                })}
              </Stack>
            </Box>

            <TextField
              label="Heading"
              value={values.title}
              onChange={setField('title')}
              size="small"
              fullWidth
              required
              error={Boolean(errors.title)}
              helperText={errors.title ?? 'One line the client would recognise.'}
              placeholder="Logo colour wrong on the new banner"
            />

            <TextField
              label="Details"
              value={values.description}
              onChange={setField('description')}
              size="small"
              fullWidth
              multiline
              minRows={3}
              placeholder="What the client said, what they expect, any reference they gave…"
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                type="date"
                label="Collected on"
                value={values.collectedOn}
                onChange={setField('collectedOn')}
                size="small"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                type="date"
                label="Due by"
                value={values.dueDate}
                onChange={setField('dueDate')}
                size="small"
                fullWidth
                error={Boolean(errors.dueDate)}
                helperText={errors.dueDate}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField select size="small" label="Priority" value={values.priority} onChange={setField('priority')} fullWidth>
                {Object.values(PRIORITIES).map((priority) => (
                  <MenuItem key={priority} value={priority}>
                    {priority}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Handled by"
                value={values.ownerId}
                onChange={setField('ownerId')}
                fullWidth
                disabled={!canAssignAnyone && followers.length > 0}
                helperText={
                  followers.length > 0
                    ? canAssignAnyone
                      ? 'Filled in from who follows this client — change it if someone else takes it.'
                      : 'Taken from who follows this client.'
                    : 'Nobody follows this client yet, so it stays with you.'
                }
              >
                <MenuItem value="">Me</MenuItem>
                {followers.length > 0 ? (
                  <ListSubheader sx={{ lineHeight: 2.2 }}>Follows this client</ListSubheader>
                ) : null}
                {followers.map((person) => (
                  <MenuItem key={person.id} value={person.id}>
                    {person.fullName}
                  </MenuItem>
                ))}
                {canAssignAnyone && assignableMembers.length > 0 ? (
                  <ListSubheader sx={{ lineHeight: 2.2 }}>Everyone else</ListSubheader>
                ) : null}
                {canAssignAnyone
                  ? assignableMembers
                      .filter((member) => !followers.some((person) => person.id === member.employeeId))
                      .map((member) => (
                        <MenuItem key={member.employeeId} value={member.employeeId}>
                          {member.fullName}
                        </MenuItem>
                      ))
                  : null}
              </TextField>
            </Stack>

            {isEditing ? (
              <Box sx={{ pt: 0.5 }}>
                <TaskAttachments taskId={ticket.id} ownerType="ticket" canEdit title="Photos & files from the client" />
              </Box>
            ) : (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <ToneChip label="Tip" tone="blue" />
                <Typography variant="caption">Save first, then add the client's screenshots to the ticket.</Typography>
              </Stack>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={onClose} variant="outlined" disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Raise ticket'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
