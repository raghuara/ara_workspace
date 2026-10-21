import {
  Box,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import { RotateCcw } from 'lucide-react'
import { StatusChip } from '@/components/StatusChip'
import { ToneChip } from '@/components/ToneChip'
import { UserAvatar } from '@/components/UserAvatar'
import { kindOf, statusOf } from '@/constants/clientDesk'
import { PRIORITY_TONES, STATUS_TONES } from '@/constants/workspaceDomain'
import { colors } from '@/theme/tokens'
import { daysUntil, formatDate, formatDateTime } from '@/utils/date'

const HEAD = {
  fontSize: '0.6875rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  color: colors.textSecondary,
  bgcolor: colors.page,
  borderBottom: `1px solid ${colors.border}`,
  py: 1.25,
}

const CELL = { verticalAlign: 'middle', py: 1.5, borderBottom: `1px solid ${colors.border}` }
const DATE = { ...CELL, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

const dayCount = (fromIso, toIso) => {
  const from = new Date(fromIso)
  const to = toIso ? new Date(toIso) : new Date()
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 86400000))
}

const timing = (ticket) => {
  const settledAt = ticket.closedAt ?? ticket.resolvedAt
  const days = dayCount(ticket.createdAt, settledAt)
  if (days === null) return ''
  if (settledAt) return days === 0 ? 'same day' : `took ${plural(days, 'day')}`
  return days === 0 ? 'today' : `${plural(days, 'day')} open`
}

const dueCell = (ticket) => {
  if (!ticket.dueDate) return { text: '—', tone: 'gray' }
  const diff = daysUntil(ticket.dueDate)
  if (!ticket.isOpen) return { text: formatDate(ticket.dueDate), tone: 'gray' }
  if (diff < 0) return { text: formatDate(ticket.dueDate), note: `${plural(Math.abs(diff), 'day')} late`, tone: 'rose' }
  if (diff === 0) return { text: formatDate(ticket.dueDate), note: 'today', tone: 'amber' }
  if (diff <= 2) return { text: formatDate(ticket.dueDate), note: `in ${plural(diff, 'day')}`, tone: 'amber' }
  return { text: formatDate(ticket.dueDate), tone: 'slate' }
}

const Blank = ({ hint }) => (
  <Tooltip title={hint}>
    <Typography component="span" sx={{ color: colors.textSecondary }}>
      —
    </Typography>
  </Tooltip>
)

const DoneDate = ({ value, hint }) =>
  value ? (
    <Tooltip title={formatDateTime(value)}>
      <Stack direction="row" spacing={0.625} sx={{ alignItems: 'center' }}>
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: STATUS_TONES.green.strong, flexShrink: 0 }} />
        <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
          {formatDate(value)}
        </Typography>
      </Stack>
    </Tooltip>
  ) : (
    <Blank hint={hint} />
  )

export const TicketTable = ({ tickets, onOpen, startIndex = 0 }) => (
  <TableContainer sx={{ maxHeight: 640 }}>
    <Table stickyHeader size="small" sx={{ minWidth: 1520, borderCollapse: 'separate' }}>
      <TableHead>
        <TableRow>
          <TableCell sx={{ ...HEAD, width: 76, pl: 2 }}>S.No</TableCell>
          <TableCell sx={{ ...HEAD, minWidth: 150 }}>Client</TableCell>
          <TableCell sx={{ ...HEAD, width: 112 }}>Shared on</TableCell>
          <TableCell sx={{ ...HEAD, minWidth: 220 }}>Requirement</TableCell>
          <TableCell sx={{ ...HEAD, minWidth: 250 }}>Description</TableCell>
          <TableCell sx={{ ...HEAD, minWidth: 170 }}>Handled by</TableCell>
          <TableCell sx={{ ...HEAD, width: 128 }}>Due date</TableCell>
          <TableCell sx={{ ...HEAD, width: 168 }}>Status</TableCell>
          <TableCell sx={{ ...HEAD, width: 104 }}>Rounds</TableCell>
          <TableCell sx={{ ...HEAD, width: 124 }}>Shown to client</TableCell>
          <TableCell sx={{ ...HEAD, width: 124, pr: 2 }}>Completed on</TableCell>
        </TableRow>
      </TableHead>

      <TableBody>
        {tickets.map((ticket, index) => {
          const kind = kindOf(ticket.kind)
          const status = statusOf(ticket.status)
          const due = dueCell(ticket)
          const age = timing(ticket)
          const priorityTone = STATUS_TONES[PRIORITY_TONES[ticket.priority] ?? 'gray']

          return (
            <TableRow
              key={ticket.id}
              hover
              onClick={() => onOpen(ticket)}
              sx={{
                cursor: 'pointer',
                bgcolor: ticket.isOverdue ? STATUS_TONES.rose.soft : index % 2 === 1 ? colors.page : colors.surface,
                '&:hover': { bgcolor: `${STATUS_TONES.blue.soft} !important` },
                '& td:first-of-type': {
                  borderLeft: `3px solid ${ticket.isOverdue ? STATUS_TONES.rose.strong : 'transparent'}`,
                },
              }}
            >
              <TableCell sx={{ ...CELL, pl: 2 }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'baseline' }}>
                  <Typography variant="caption" sx={{ color: colors.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                    {startIndex + index + 1}
                  </Typography>
                  <Typography
                    sx={{ fontSize: '0.6875rem', fontWeight: 800, letterSpacing: '0.02em', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {ticket.token}
                  </Typography>
                </Stack>
                {ticket.reopenCount > 0 ? (
                  <Tooltip title={`Came back ${plural(ticket.reopenCount, 'time')}`}>
                    <Stack direction="row" spacing={0.25} sx={{ mt: 0.25, alignItems: 'center', color: STATUS_TONES.orange.strong }}>
                      <RotateCcw size={11} strokeWidth={2.25} aria-hidden="true" />
                      <Typography variant="caption" sx={{ color: 'inherit', fontWeight: 700 }}>
                        ×{ticket.reopenCount}
                      </Typography>
                    </Stack>
                  </Tooltip>
                ) : null}
              </TableCell>

              <TableCell sx={CELL}>
                <ToneChip label={ticket.clientName} tone={ticket.clientTone} />
                {ticket.clientCompany ? (
                  <Typography variant="caption" component="p" noWrap sx={{ mt: 0.375, color: colors.textSecondary }}>
                    {ticket.clientCompany}
                  </Typography>
                ) : null}
              </TableCell>

              <TableCell sx={DATE}>
                <Typography variant="caption">{formatDate(ticket.collectedOn ?? ticket.createdAt)}</Typography>
              </TableCell>

              <TableCell sx={{ ...CELL, maxWidth: 280 }}>
                <Stack direction="row" spacing={0.875} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
                  <Tooltip title={`${ticket.priority} priority`}>
                    <Box
                      sx={{ mt: 0.75, width: 7, height: 7, borderRadius: '50%', bgcolor: priorityTone.strong, flexShrink: 0 }}
                    />
                  </Tooltip>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.35 }}>
                      {ticket.title}
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <ToneChip label={kind.label} tone={kind.tone} />
                    </Box>
                  </Box>
                </Stack>
              </TableCell>

              <TableCell sx={{ ...CELL, maxWidth: 340 }}>
                {ticket.description ? (
                  <Tooltip title={ticket.description}>
                    <Typography
                      variant="caption"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.45,
                        color: colors.textSecondary,
                      }}
                    >
                      {ticket.description}
                    </Typography>
                  </Tooltip>
                ) : (
                  <Blank hint="No details were written down" />
                )}
              </TableCell>

              <TableCell sx={CELL}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                  <UserAvatar name={ticket.ownerName} size={28} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                      {ticket.ownerName}
                    </Typography>
                    <Typography variant="caption" component="p" noWrap sx={{ color: colors.textSecondary }}>
                      from {ticket.raisedByName}
                    </Typography>
                  </Box>
                </Stack>
              </TableCell>

              <TableCell sx={DATE}>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: due.tone === 'rose' ? 700 : 500, color: STATUS_TONES[due.tone].strong }}
                >
                  {due.text}
                </Typography>
                {due.note ? (
                  <Box
                    sx={{
                      mt: 0.375,
                      display: 'inline-block',
                      px: 0.75,
                      py: 0.125,
                      borderRadius: 999,
                      bgcolor: STATUS_TONES[due.tone].soft,
                      color: STATUS_TONES[due.tone].strong,
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                    }}
                  >
                    {due.note}
                  </Box>
                ) : null}
              </TableCell>

              <TableCell sx={{ ...CELL, whiteSpace: 'nowrap' }}>
                <StatusChip label={ticket.status} tone={status.tone} size="small" />
                {age ? (
                  <Typography variant="caption" component="p" sx={{ mt: 0.375, color: colors.textSecondary }}>
                    {age}
                  </Typography>
                ) : null}
              </TableCell>

              <TableCell sx={CELL}>
                <Tooltip title={ticket.reopenCount > 0 ? 'The client asked for changes after it was shown' : 'Straight through'}>
                  <Box
                    sx={{
                      display: 'inline-block',
                      px: 0.875,
                      py: 0.125,
                      borderRadius: 999,
                      bgcolor: ticket.reopenCount > 0 ? STATUS_TONES.orange.soft : STATUS_TONES.gray.soft,
                      color: ticket.reopenCount > 0 ? STATUS_TONES.orange.strong : colors.textSecondary,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {ticket.reopenCount + 1}×
                  </Box>
                </Tooltip>
              </TableCell>

              <TableCell sx={DATE}>
                <DoneDate value={ticket.resolvedAt} hint="Not shown to the client yet" />
              </TableCell>

              <TableCell sx={{ ...DATE, pr: 2 }}>
                <DoneDate value={ticket.closedAt} hint="The client has not signed it off yet" />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  </TableContainer>
)
