import { useState } from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'
import { ChevronRight, MessageSquareQuote, Quote } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { LinkifiedText } from '@/components/LinkifiedText'
import { ListSectionSkeleton } from '@/components/Skeletons'
import { QueryStateView } from '@/components/QueryStateView'
import { StatusChip } from '@/components/StatusChip'
import { ToneChip } from '@/components/ToneChip'
import { UserAvatar } from '@/components/UserAvatar'
import { FEEDBACK_KIND, statusOf } from '@/constants/clientDesk'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { colors } from '@/theme/tokens'
import { formatDate } from '@/utils/date'

const when = (ticket) => ticket.collectedOn ?? ticket.createdAt ?? ''

const groupByClient = (tickets) => {
  const groups = new Map()
  tickets.forEach((ticket) => {
    const entry = groups.get(ticket.clientId) ?? {
      id: ticket.clientId,
      name: ticket.clientName,
      company: ticket.clientCompany,
      tone: ticket.clientTone,
      items: [],
    }
    entry.items.push(ticket)
    groups.set(ticket.clientId, entry)
  })

  return [...groups.values()]
    .map((group) => ({
      ...group,
      items: [...group.items].sort((a, b) => when(b).localeCompare(when(a))),
      open: group.items.filter((ticket) => ticket.isOpen).length,
    }))
    .sort((a, b) => b.open - a.open || when(b.items[0]).localeCompare(when(a.items[0])))
}

const Chip = ({ selected, onClick, children }) => (
  <Box
    component="button"
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    sx={{
      height: 28,
      px: 1.25,
      border: `1px solid ${selected ? colors.brand : colors.border}`,
      borderRadius: 999,
      bgcolor: selected ? colors.brandSoft : colors.surface,
      color: selected ? colors.brandDark : colors.textSecondary,
      font: 'inherit',
      fontSize: '0.75rem',
      fontWeight: selected ? 700 : 500,
      cursor: 'pointer',
    }}
  >
    {children}
  </Box>
)

const FeedbackCard = ({ ticket, onOpen }) => {
  const status = statusOf(ticket.status)
  const tone = STATUS_TONES.rose

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => onOpen(ticket)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(ticket)
        }
      }}
      sx={{
        borderRadius: 2.5,
        border: `1px solid ${colors.border}`,
        borderLeft: `4px solid ${ticket.isOpen ? tone.strong : colors.border}`,
        bgcolor: colors.surface,
        cursor: 'pointer',
        transition: 'border-color 120ms ease, box-shadow 120ms ease',
        '&:hover': { boxShadow: '0 2px 10px rgba(15, 23, 42, 0.08)', borderColor: tone.border },
        '&:focus-visible': { outline: `2px solid ${colors.brand}`, outlineOffset: 2 },
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', px: 1.75, pt: 1.25 }}>
        <Typography
          component="span"
          sx={{ fontSize: '0.6875rem', fontWeight: 800, color: colors.textSecondary, fontVariantNumeric: 'tabular-nums' }}
        >
          {ticket.token}
        </Typography>
        <StatusChip label={ticket.status} tone={status.tone} size="small" />
        {ticket.reopenCount > 0 ? <ToneChip label={`${ticket.reopenCount}× back`} tone="orange" /> : null}
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" noWrap sx={{ color: colors.textSecondary }}>
          {when(ticket) ? formatDate(when(ticket)) : ''}
        </Typography>
      </Stack>

      <Typography sx={{ px: 1.75, pt: 0.75, fontSize: '0.9375rem', fontWeight: 650, lineHeight: 1.35 }}>
        {ticket.title}
      </Typography>

      {ticket.description ? (
        <Box sx={{ px: 1.75, pt: 1 }}>
          <Box
            sx={{
              position: 'relative',
              px: 1.5,
              py: 1.25,
              borderRadius: 2,
              bgcolor: tone.soft,
              border: `1px solid ${tone.border}`,
            }}
          >
            <Box sx={{ position: 'absolute', top: 8, left: 8, color: tone.border }}>
              <Quote size={14} strokeWidth={2.5} aria-hidden="true" />
            </Box>
            <Box
              sx={{
                pl: 2.5,
                maxWidth: '68ch',
                fontSize: '0.9375rem',
                lineHeight: 1.75,
                color: colors.textPrimary,
                display: '-webkit-box',
                WebkitLineClamp: 6,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              <LinkifiedText text={ticket.description} />
            </Box>
          </Box>
        </Box>
      ) : (
        <Typography variant="caption" component="p" sx={{ px: 1.75, pt: 1, color: colors.textSecondary, fontStyle: 'italic' }}>
          Nothing was written down for this one.
        </Typography>
      )}

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', px: 1.75, py: 1.25 }}>
        <UserAvatar name={ticket.ownerName} size={24} />
        <Typography variant="caption" noWrap sx={{ minWidth: 0 }}>
          <Box component="span" sx={{ color: colors.textSecondary }}>
            Handled by{' '}
          </Box>
          <Box component="span" sx={{ fontWeight: 650 }}>
            {ticket.ownerName}
          </Box>
        </Typography>
        <Typography variant="caption" noWrap sx={{ color: colors.textSecondary, display: { xs: 'none', sm: 'block' } }}>
          · collected by {ticket.raisedByName}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" sx={{ color: colors.brand, fontWeight: 650, whiteSpace: 'nowrap' }}>
          Open
        </Typography>
        <ChevronRight size={14} strokeWidth={2} color={colors.brand} aria-hidden="true" />
      </Stack>
    </Box>
  )
}

export const FeedbackBoard = ({ tickets, loading, error, onRetry, onOpen, onAdd, canManage, search = '' }) => {
  const [openOnly, setOpenOnly] = useState(true)

  const term = search.trim().toLowerCase()
  const feedback = tickets.filter((ticket) => ticket.kind === FEEDBACK_KIND)
  const matching = feedback.filter(
    (ticket) =>
      !term ||
      ticket.title.toLowerCase().includes(term) ||
      ticket.clientName.toLowerCase().includes(term) ||
      (ticket.description ?? '').toLowerCase().includes(term),
  )
  const shown = openOnly ? matching.filter((ticket) => ticket.isOpen) : matching
  const groups = groupByClient(shown)

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <ListSectionSkeleton rows={4} wide />
      </Box>
    )
  }

  return (
    <QueryStateView error={error} onRetry={onRetry}>
      <Stack
        direction="row"
        spacing={0.75}
        useFlexGap
        sx={{ px: 1.75, py: 1.25, alignItems: 'center', flexWrap: 'wrap', borderBottom: `1px solid ${colors.border}` }}
      >
        <Chip selected={openOnly} onClick={() => setOpenOnly(true)}>
          Still open ({matching.filter((ticket) => ticket.isOpen).length})
        </Chip>
        <Chip selected={!openOnly} onClick={() => setOpenOnly(false)}>
          Everything ({matching.length})
        </Chip>
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" sx={{ color: colors.textSecondary }}>
          What clients told us, in their words — newest first
        </Typography>
      </Stack>

      {shown.length === 0 ? (
        <EmptyState
          icon={MessageSquareQuote}
          title={feedback.length === 0 ? 'No feedback recorded yet' : 'Nothing open right now'}
          description={
            feedback.length === 0
              ? 'When a client tells you something — an issue, a suggestion — record it here so everyone can read it.'
              : 'Every piece of feedback has been dealt with. Switch to Everything to read the older ones.'
          }
          actionLabel={canManage && feedback.length === 0 ? 'Record feedback' : undefined}
          onAction={canManage && feedback.length === 0 ? onAdd : undefined}
        />
      ) : (
        <Box sx={{ p: { xs: 1.25, sm: 1.75 } }}>
          <Stack spacing={2.5}>
            {groups.map((group) => (
              <Box key={group.id}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', mb: 1, pb: 0.75, borderBottom: `1px solid ${colors.border}` }}
                >
                  <ToneChip label={group.name} tone={group.tone} size="medium" />
                  {group.company ? (
                    <Typography variant="caption" noWrap sx={{ color: colors.textSecondary }}>
                      {group.company}
                    </Typography>
                  ) : null}
                  <Box sx={{ flex: 1 }} />
                  <Typography variant="caption" sx={{ color: colors.textSecondary, whiteSpace: 'nowrap' }}>
                    {group.items.length} {group.items.length === 1 ? 'note' : 'notes'}
                    {group.open > 0 ? ` · ${group.open} open` : ''}
                  </Typography>
                </Stack>

                <Box
                  sx={{
                    display: 'grid',
                    gap: 1.25,
                    gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'repeat(2, minmax(0, 1fr))' },
                  }}
                >
                  {group.items.map((ticket) => (
                    <FeedbackCard key={ticket.id} ticket={ticket} onOpen={onOpen} />
                  ))}
                </Box>
              </Box>
            ))}
          </Stack>

          {canManage ? (
            <Stack direction="row" sx={{ justifyContent: 'center', pt: 2.5 }}>
              <Button variant="outlined" size="small" startIcon={<MessageSquareQuote size={15} strokeWidth={2} />} onClick={onAdd}>
                Record what a client said
              </Button>
            </Stack>
          ) : null}
        </Box>
      )}
    </QueryStateView>
  )
}
