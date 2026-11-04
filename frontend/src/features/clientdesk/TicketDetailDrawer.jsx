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
import { Check, Clock3, Pencil, Quote, RotateCcw, Send, TriangleAlert, X } from 'lucide-react'
import { DefinitionList } from '@/components/DefinitionList'
import { LinkifiedText } from '@/components/LinkifiedText'
import { QueryStateView } from '@/components/QueryStateView'
import { StatusChip } from '@/components/StatusChip'
import { ToneChip } from '@/components/ToneChip'
import { UserAvatar } from '@/components/UserAvatar'
import { TaskAttachments } from '@/features/workspace/components/TaskAttachments'
import { ticketService } from '@/api/ticketService'
import { FEEDBACK_KIND, NEXT_STATUSES, STATUS_ACTIONS, changeRounds, kindOf, roundLabel, statusOf } from '@/constants/clientDesk'
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

const FLOW = ['New', 'In progress', 'With client', 'Completed']

const flowIndex = (status) => (status === 'Reopened' ? 1 : FLOW.indexOf(status))

const FlowSteps = ({ status, reopenCount }) => {
  const current = flowIndex(status)
  return (
    <Stack direction="row" sx={{ alignItems: 'stretch', mb: 2 }}>
      {FLOW.map((step, index) => {
        const done = index < current
        const here = index === current
        const label = here && status === 'Reopened' ? 'Reopened' : step
        const tone = STATUS_TONES[statusOf(label).tone]
        return (
          <Box key={step} sx={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
            <Stack direction="row" sx={{ alignItems: 'center' }}>
              <Box sx={{ flex: 1, height: 2, bgcolor: index === 0 ? 'transparent' : done || here ? tone.border : colors.border }} />
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '50%',
                  bgcolor: done ? STATUS_TONES.green.strong : here ? tone.strong : colors.surface,
                  border: `2px solid ${done ? STATUS_TONES.green.strong : here ? tone.strong : colors.border}`,
                  color: '#FFFFFF',
                }}
              >
                {done ? <Check size={12} strokeWidth={3} aria-hidden="true" /> : null}
              </Box>
              <Box sx={{ flex: 1, height: 2, bgcolor: index === FLOW.length - 1 ? 'transparent' : done ? STATUS_TONES.green.border : colors.border }} />
            </Stack>
            <Typography
              variant="caption"
              component="p"
              noWrap
              sx={{ mt: 0.5, fontWeight: here ? 700 : 500, color: here ? tone.strong : colors.textSecondary }}
            >
              {label}
            </Typography>
            {here && reopenCount > 0 ? (
              <Typography variant="caption" component="p" sx={{ color: STATUS_TONES.orange.strong, fontWeight: 600 }}>
                {roundLabel(reopenCount).toLowerCase()}
              </Typography>
            ) : null}
          </Box>
        )
      })}
    </Stack>
  )
}

const ClientWords = ({ ticket, kind }) => {
  const tone = STATUS_TONES[kind.tone]
  const isFeedback = ticket.kind === FEEDBACK_KIND
  return (
    <Box
      sx={{
        mb: 2,
        borderRadius: 2.5,
        bgcolor: isFeedback ? tone.soft : colors.page,
        border: `1px solid ${isFeedback ? tone.border : colors.border}`,
        borderLeft: `4px solid ${tone.strong}`,
        overflow: 'hidden',
      }}
    >
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', px: 1.75, pt: 1.25 }}>
        <Quote size={13} strokeWidth={2} color={tone.strong} aria-hidden="true" />
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: tone.strong }}
        >
          {isFeedback ? 'What the client said' : 'What they asked for'}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" noWrap sx={{ color: colors.textSecondary }}>
          {ticket.collectedOn ? formatDate(ticket.collectedOn) : ''}
        </Typography>
      </Stack>
      <Box
        sx={{
          px: 1.75,
          py: 1.25,
          fontSize: isFeedback ? '0.9375rem' : '0.875rem',
          lineHeight: 1.7,
          color: colors.textPrimary,
        }}
      >
        <LinkifiedText text={ticket.description} />
      </Box>
      <Typography
        variant="caption"
        component="p"
        sx={{ px: 1.75, pb: 1.25, color: colors.textSecondary }}
      >
        Collected by {ticket.raisedByName}
      </Typography>
    </Box>
  )
}

/** Round 1 is the original ask; every send-back starts the next one. */
const buildRounds = (ticket, events) => {
  const backs = [...(events ?? [])]
    .filter((entry) => entry.action === 'reopened')
    .sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''))

  return [
    {
      number: 1,
      at: ticket.collectedOn ?? ticket.createdAt,
      note: ticket.description,
      by: ticket.raisedByName,
      first: true,
    },
    ...backs.map((entry, index) => ({
      number: index + 2,
      at: entry.at,
      note: entry.detail?.note ?? '',
      by: entry.actorName,
      first: false,
    })),
  ]
}

const RoundTrail = ({ rounds, status }) => (
  <Box sx={{ mb: 2.5 }}>
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
      <RotateCcw size={14} strokeWidth={2} color={STATUS_TONES.orange.strong} aria-hidden="true" />
      <Typography variant="subtitle2" component="p" sx={{ color: STATUS_TONES.orange.strong }}>
        {changeRounds(rounds.length - 1)}
      </Typography>
    </Stack>

    <Stack component="ol" spacing={1} sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {rounds.map((round, index) => {
        const current = index === rounds.length - 1 && status !== 'Completed'
        return (
          <Stack
            key={round.number}
            component="li"
            direction="row"
            spacing={1.25}
            sx={{
              px: 1.25,
              py: 1,
              borderRadius: 2,
              bgcolor: current ? STATUS_TONES.orange.soft : colors.page,
              border: `1px solid ${current ? STATUS_TONES.orange.border : colors.border}`,
            }}
          >
            <Box
              sx={{
                width: 24,
                height: 24,
                flexShrink: 0,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '50%',
                bgcolor: round.first ? STATUS_TONES.blue.strong : STATUS_TONES.orange.strong,
                color: '#FFFFFF',
                fontSize: '0.6875rem',
                fontWeight: 800,
              }}
            >
              {round.number}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  {round.first ? 'First ask' : `Change ${round.number - 1}`}
                </Typography>
                <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                  {round.at ? formatDate(round.at) : ''} · {round.by}
                </Typography>
                {current ? <ToneChip label="Working on this" tone="orange" /> : null}
              </Stack>
              <Typography
                variant="body2"
                sx={{
                  mt: 0.25,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {round.note || '—'}
              </Typography>
            </Box>
          </Stack>
        )
      })}
    </Stack>
  </Box>
)

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
  const rounds = buildRounds(ticket, events.data)

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
        <FlowSteps status={ticket.status} reopenCount={ticket.reopenCount ?? 0} />

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

        {ticket.description ? <ClientWords ticket={ticket} kind={kind} /> : null}

        {(ticket.reopenCount ?? 0) > 0 ? <RoundTrail rounds={rounds} status={ticket.status} /> : null}

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
