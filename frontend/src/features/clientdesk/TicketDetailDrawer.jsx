import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { Check, Clock3, Pencil, RotateCcw, Send, TriangleAlert, X } from 'lucide-react'
import { DefinitionList } from '@/components/DefinitionList'
import { LinkifiedText } from '@/components/LinkifiedText'
import { QueryStateView } from '@/components/QueryStateView'
import { StatusChip } from '@/components/StatusChip'
import { ToneChip } from '@/components/ToneChip'
import { UserAvatar } from '@/components/UserAvatar'
import { TaskAttachments } from '@/features/workspace/components/TaskAttachments'
import { ticketService } from '@/api/ticketService'
import { NEXT_STATUSES, STATUS_ACTIONS, kindOf, roundLabel, statusOf } from '@/constants/clientDesk'
import { PRIORITY_TONES, STATUS_TONES } from '@/constants/workspaceDomain'
import { useAsync } from '@/hooks/useAsync'
import { colors } from '@/theme/tokens'
import { daysUntil, formatDate, formatDateTime, formatTimeAgo } from '@/utils/date'

const dueText = (ticket) => {
  if (!ticket.dueDate) return 'No due date'
  const diff = daysUntil(ticket.dueDate)
  if (!ticket.isOpen) return `Due ${formatDate(ticket.dueDate)}`
  if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} late`
  if (diff === 0) return 'Due today'
  if (diff === 1) return 'Due tomorrow'
  return `Due in ${diff} days`
}

const ACTION_ICONS = { Completed: Check, Reopened: RotateCcw, 'With client': Send }

const StatusDialog = ({ ticket, target, onClose, onDone }) => {
  const reopening = target === 'Reopened'
  const [note, setNote] = useState('')
  const [dueDate, setDueDate] = useState(ticket.dueDate ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const confirm = async () => {
    if (reopening && !note.trim()) {
      setError('Say what the client asked for.')
      return
    }
    setBusy(true)
    setError('')
    try {
      onDone(await ticketService.changeStatus(ticket.id, { status: target, note: note.trim(), dueDate }))
      onClose()
    } catch (caught) {
      setError(caught.message ?? 'That could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600 }}>
        {reopening ? `${ticket.token} came back` : `Move ${ticket.token} to ${target.toLowerCase()}`}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 0.5 }}>
          {reopening ? (
            <Alert severity="info">
              The same token stays, so every round is counted on one ticket. This will be{' '}
              {roundLabel((ticket.reopenCount ?? 0) + 1).toLowerCase()}.
            </Alert>
          ) : null}
          {target === 'Completed' ? (
            <Alert severity="info">Only mark this completed once the client has seen it and is happy.</Alert>
          ) : null}
          <TextField
            label={reopening ? 'What did the client ask for?' : 'Note (optional)'}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            size="small"
            fullWidth
            multiline
            minRows={2}
            required={reopening}
            autoFocus
          />
          {reopening ? (
            <TextField
              type="date"
              label="New due date"
              value={dueDate ?? ''}
              onChange={(event) => setDueDate(event.target.value)}
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          ) : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant="outlined" disabled={busy}>
          Cancel
        </Button>
        <Button onClick={confirm} variant="contained" disabled={busy}>
          {busy ? 'Saving…' : reopening ? 'Send it back' : 'Confirm'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export const TicketDetailDrawer = ({ ticket, canManage, onClose, onChanged, onEdit }) => {
  const [target, setTarget] = useState(null)
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)

  const events = useAsync(ticketService.listEvents, [ticket.id], { keepPrevious: false })
  const status = statusOf(ticket.status)
  const kind = kindOf(ticket.kind)
  const tone = STATUS_TONES[status.tone]

  const sendNote = async () => {
    if (!note.trim()) return
    setSending(true)
    try {
      await ticketService.addNote(ticket.id, note.trim())
      setNote('')
      events.reload()
    } finally {
      setSending(false)
    }
  }

  return (
    <Drawer
      anchor="right"
      open
      onClose={onClose}
      aria-label={`Ticket ${ticket.token}`}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 560 }, borderLeft: `3px solid ${tone.strong}` } } }}
    >
      <Box sx={{ px: 2, pt: 1.75, pb: 1.5, bgcolor: tone.soft, borderBottom: `1px solid ${tone.border}` }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.25 }}>
          <Box
            sx={{
              px: 1,
              py: 0.25,
              borderRadius: 1.5,
              bgcolor: colors.surface,
              border: `1px solid ${tone.border}`,
              color: tone.strong,
              fontSize: '0.8125rem',
              fontWeight: 800,
              letterSpacing: '0.03em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {ticket.token}
          </Box>
          <StatusChip label={ticket.status} tone={status.tone} size="small" />
          <ToneChip label={kind.label} tone={kind.tone} />
          {ticket.reopenCount > 0 ? <ToneChip label={roundLabel(ticket.reopenCount)} tone="orange" /> : null}
          <Box sx={{ flex: 1 }} />
          {canManage ? (
            <Tooltip title="Edit details">
              <IconButton size="small" aria-label="Edit ticket" onClick={() => onEdit(ticket)}>
                <Pencil size={15} strokeWidth={1.75} />
              </IconButton>
            </Tooltip>
          ) : null}
          <IconButton size="small" aria-label="Close" onClick={onClose}>
            <X size={16} strokeWidth={1.75} />
          </IconButton>
        </Stack>

        <Typography variant="h2" component="h2" sx={{ fontSize: '1rem', lineHeight: 1.35 }}>
          {ticket.title}
        </Typography>

        <Stack direction="row" spacing={0.75} useFlexGap sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <ToneChip label={ticket.clientName} tone={ticket.clientTone} size="medium" />
          <ToneChip label={ticket.priority} tone={PRIORITY_TONES[ticket.priority] ?? 'gray'} />
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ alignItems: 'center', color: ticket.isOverdue ? STATUS_TONES.rose.strong : colors.textSecondary }}
          >
            {ticket.isOverdue ? <TriangleAlert size={13} strokeWidth={2} /> : <Clock3 size={13} strokeWidth={1.75} />}
            <Typography variant="caption" sx={{ color: 'inherit', fontWeight: ticket.isOverdue ? 700 : 500 }}>
              {dueText(ticket)}
            </Typography>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 2 }}>
        {canManage ? (
          <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', mb: 2 }}>
            {(NEXT_STATUSES[ticket.status] ?? []).map((next) => {
              const Icon = ACTION_ICONS[next]
              const action = STATUS_ACTIONS[next] ?? { label: next, primary: false }
              const nextTone = STATUS_TONES[statusOf(next).tone]
              return (
                <Tooltip key={next} title={statusOf(next).hint}>
                  <Button
                    size="small"
                    variant={action.primary ? 'contained' : 'outlined'}
                    onClick={() => setTarget(next)}
                    startIcon={Icon ? <Icon size={14} strokeWidth={2} /> : undefined}
                    sx={
                      action.primary
                        ? { bgcolor: nextTone.strong, '&:hover': { bgcolor: nextTone.strong, filter: 'brightness(0.94)' } }
                        : undefined
                    }
                  >
                    {action.label}
                  </Button>
                </Tooltip>
              )
            })}
          </Stack>
        ) : null}

        {ticket.description ? (
          <Box sx={{ px: 1.5, py: 1.25, mb: 2, borderRadius: 2, bgcolor: colors.page, border: `1px solid ${colors.border}` }}>
            <LinkifiedText text={ticket.description} />
          </Box>
        ) : null}

        <DefinitionList
          columns={{ xs: 1, sm: 2 }}
          items={[
            { label: 'Collected on', value: ticket.collectedOn ? formatDate(ticket.collectedOn) : '—' },
            { label: 'Due by', value: ticket.dueDate ? formatDate(ticket.dueDate) : '—' },
            { label: 'Raised by', value: ticket.raisedByName },
            { label: 'Handled by', value: ticket.ownerName },
            { label: 'Client', value: ticket.clientCompany || ticket.clientName },
            { label: 'Rounds so far', value: roundLabel(ticket.reopenCount) },
            { label: 'Shown to client', value: ticket.resolvedAt ? formatDateTime(ticket.resolvedAt) : 'Not yet' },
            { label: 'Completed on', value: ticket.closedAt ? formatDateTime(ticket.closedAt) : 'Not yet' },
          ]}
        />

        <Box sx={{ mt: 2.5 }}>
          <TaskAttachments taskId={ticket.id} ownerType="ticket" canEdit={canManage} title="Photos & files from the client" />
        </Box>

        <Typography variant="subtitle2" component="p" sx={{ mt: 2.5, mb: 1.5 }}>
          History
        </Typography>

        <QueryStateView error={events.error} onRetry={events.reload}>
          <Stack component="ol" spacing={1.75} sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {(events.data ?? []).map((entry) => (
              <Box component="li" key={entry.id} sx={{ display: 'flex', gap: 1.25 }}>
                <UserAvatar name={entry.actorName} size={28} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={0.75} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {entry.actorName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {entry.summary}
                    </Typography>
                    <Tooltip title={formatDateTime(entry.at)}>
                      <Typography variant="caption">{formatTimeAgo(entry.at)}</Typography>
                    </Tooltip>
                  </Stack>
                  {entry.detail?.note ? (
                    <Box
                      sx={{
                        mt: 0.5,
                        px: 1.25,
                        py: 0.875,
                        borderRadius: '4px 12px 12px 12px',
                        bgcolor: colors.page,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      <LinkifiedText text={entry.detail.note} />
                    </Box>
                  ) : null}
                  {entry.detail?.from && entry.detail?.to ? (
                    <Typography variant="caption" component="p" sx={{ mt: 0.25 }}>
                      {entry.detail.from} → {entry.detail.to}
                    </Typography>
                  ) : null}
                </Box>
              </Box>
            ))}
          </Stack>
        </QueryStateView>
      </Box>

      {canManage ? (
        <Stack direction="row" spacing={1} sx={{ px: 2, py: 1.5, borderTop: `1px solid ${colors.border}` }}>
          <TextField
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault()
                sendNote()
              }
            }}
            size="small"
            fullWidth
            placeholder="Add what the client said…"
            disabled={sending}
          />
          <Button
            variant="contained"
            onClick={sendNote}
            disabled={sending || !note.trim()}
            sx={{ flexShrink: 0 }}
            startIcon={<Send size={14} strokeWidth={2} />}
          >
            Add
          </Button>
        </Stack>
      ) : null}

      {target ? (
        <StatusDialog
          ticket={ticket}
          target={target}
          onClose={() => setTarget(null)}
          onDone={(saved) => {
            onChanged(saved)
            events.reload()
          }}
        />
      ) : null}
    </Drawer>
  )
}
