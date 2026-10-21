import { useMemo } from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'
import { ArrowRight, ChevronRight, Clock3, Headset, RotateCcw, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/SectionCard'
import { EmptyState } from '@/components/EmptyState'
import { ListSectionSkeleton } from '@/components/Skeletons'
import { QueryStateView } from '@/components/QueryStateView'
import { StatusChip } from '@/components/StatusChip'
import { ToneChip } from '@/components/ToneChip'
import { ticketService } from '@/api/ticketService'
import { ROUTES, withFilters } from '@/constants/routes'
import { TICKET_KINDS, kindOf, statusOf } from '@/constants/clientDesk'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { useAsync } from '@/hooks/useAsync'
import { colors } from '@/theme/tokens'
import { daysUntil, formatDate } from '@/utils/date'

const DAY = 86400000

const dueLabel = (ticket) => {
  if (!ticket.dueDate) return { text: 'No due date', tone: 'gray', late: false }
  const diff = daysUntil(ticket.dueDate)
  if (diff < 0) return { text: `${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} late`, tone: 'rose', late: true }
  if (diff === 0) return { text: 'Due today', tone: 'amber', late: false }
  if (diff === 1) return { text: 'Tomorrow', tone: 'amber', late: false }
  return { text: formatDate(ticket.dueDate), tone: 'slate', late: false }
}

const settledDays = (ticket) => {
  const settledAt = ticket.closedAt ?? ticket.resolvedAt
  if (!settledAt) return null
  const from = new Date(ticket.createdAt).getTime()
  const to = new Date(settledAt).getTime()
  if (Number.isNaN(from) || Number.isNaN(to)) return null
  return { days: Math.max(0, Math.round((to - from) / DAY)), at: to }
}

const summarise = (tickets) => {
  const open = tickets.filter((ticket) => ticket.isOpen)
  const cutoff = Date.now() - 30 * DAY
  const settled = tickets.map(settledDays).filter((entry) => entry && entry.at >= cutoff)
  const total = settled.reduce((sum, entry) => sum + entry.days, 0)

  return {
    open: open.length,
    overdue: open.filter((ticket) => ticket.isOverdue).length,
    waiting: open.filter((ticket) => ticket.status === 'With client').length,
    reopened: open.filter((ticket) => ticket.reopenCount > 0).length,
    byKind: TICKET_KINDS.map((kind) => ({
      ...kind,
      count: open.filter((ticket) => ticket.kind === kind.value).length,
    })).filter((kind) => kind.count > 0),
    settledCount: settled.length,
    settledAverage: settled.length > 0 ? Math.round(total / settled.length) : null,
    pressing: [...open]
      .sort((a, b) => {
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1
        if (!a.dueDate) return b.dueDate ? 1 : 0
        if (!b.dueDate) return -1
        return a.dueDate.localeCompare(b.dueDate)
      })
      .slice(0, 5),
  }
}

const Tile = ({ label, value, tone, icon: Icon, to }) => (
  <Box
    component={Link}
    to={to}
    sx={{
      display: 'block',
      p: 1.25,
      borderRadius: 2,
      border: `1px solid ${STATUS_TONES[tone].border}`,
      bgcolor: STATUS_TONES[tone].soft,
      color: 'inherit',
      textDecoration: 'none',
      minWidth: 0,
      transition: 'transform 120ms ease, box-shadow 120ms ease',
      '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)' },
    }}
  >
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: STATUS_TONES[tone].strong }}>
      <Icon size={13} strokeWidth={2} aria-hidden="true" />
      <Typography variant="caption" noWrap sx={{ color: 'inherit', fontWeight: 650 }}>
        {label}
      </Typography>
    </Stack>
    <Typography sx={{ mt: 0.25, fontSize: '1.375rem', fontWeight: 750, lineHeight: 1.1, color: STATUS_TONES[tone].strong }}>
      {value}
    </Typography>
  </Box>
)

export const ClientDeskSummaryCard = ({ workspaceId }) => {
  const query = useMemo(() => ({ workspaceId }), [workspaceId])
  const tickets = useAsync(ticketService.listTickets, [query], { enabled: Boolean(workspaceId) })

  const data = useMemo(() => summarise(tickets.data ?? []), [tickets.data])

  return (
    <SectionCard
      title="Client Desk"
      description={
        data.overdue > 0
          ? `${data.overdue} of ${data.open} open tickets are past their date`
          : 'Complaints, requirements and changes — each with its own token'
      }
      accent={data.overdue > 0 ? 'rose' : 'blue'}
      padded={false}
      action={
        <Button
          component={Link}
          to={ROUTES.clientDesk}
          size="small"
          variant="text"
          endIcon={<ArrowRight size={14} strokeWidth={2} />}
        >
          Open desk
        </Button>
      }
    >
      <QueryStateView error={tickets.error} onRetry={tickets.reload}>
        {tickets.loading && !tickets.data ? (
          <Box sx={{ p: 2 }}>
            <ListSectionSkeleton rows={4} />
          </Box>
        ) : (
          <>
            <Box
              sx={{
                display: 'grid',
                gap: 1,
                gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' },
                px: 1.75,
                py: 1.5,
              }}
            >
              <Tile label="Open" value={data.open} tone="blue" icon={Headset} to={withFilters(ROUTES.clientDesk, { tab: 'open' })} />
              <Tile
                label="Overdue"
                value={data.overdue}
                tone={data.overdue > 0 ? 'rose' : 'green'}
                icon={TriangleAlert}
                to={withFilters(ROUTES.clientDesk, { tab: 'overdue' })}
              />
              <Tile
                label="With client"
                value={data.waiting}
                tone="amber"
                icon={Clock3}
                to={withFilters(ROUTES.clientDesk, { tab: 'withclient' })}
              />
              <Tile
                label="Reopened"
                value={data.reopened}
                tone="orange"
                icon={RotateCcw}
                to={withFilters(ROUTES.clientDesk, { tab: 'reopened' })}
              />
            </Box>

            {data.byKind.length > 0 ? (
              <Stack
                direction="row"
                spacing={0.75}
                useFlexGap
                sx={{ px: 1.75, pb: 1.5, alignItems: 'center', flexWrap: 'wrap' }}
              >
                {data.byKind.map((kind) => (
                  <Box
                    key={kind.value}
                    component={Link}
                    to={withFilters(ROUTES.clientDesk, { tab: 'open', kind: kind.value })}
                    sx={{ textDecoration: 'none' }}
                  >
                    <ToneChip label={`${kind.label} ${kind.count}`} tone={kind.tone} />
                  </Box>
                ))}
              </Stack>
            ) : null}

            <Box sx={{ borderTop: `1px solid ${colors.border}` }}>
              {data.pressing.length === 0 ? (
                <EmptyState icon={Headset} title="Nothing waiting" description="Client requests and complaints show up here." />
              ) : (
                data.pressing.map((ticket) => {
                  const due = dueLabel(ticket)
                  const tone = STATUS_TONES[due.tone]
                  return (
                    <Box
                      key={ticket.id}
                      component={Link}
                      to={withFilters(ROUTES.clientDesk, { ticket: ticket.id })}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        px: 1.75,
                        py: 1.125,
                        textDecoration: 'none',
                        color: 'inherit',
                        borderLeft: `3px solid ${ticket.isOverdue ? STATUS_TONES.rose.strong : 'transparent'}`,
                        borderBottom: `1px solid ${colors.border}`,
                        '&:last-of-type': { borderBottom: 0 },
                        '&:hover': { bgcolor: colors.page },
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
                          <Typography
                            component="span"
                            sx={{ fontSize: '0.6875rem', fontWeight: 800, color: colors.textSecondary, flexShrink: 0 }}
                          >
                            {ticket.token}
                          </Typography>
                          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                            {ticket.title}
                          </Typography>
                        </Stack>
                        <Stack
                          direction="row"
                          spacing={0.75}
                          useFlexGap
                          sx={{ mt: 0.375, alignItems: 'center', flexWrap: 'wrap' }}
                        >
                          <ToneChip label={ticket.clientName} tone={ticket.clientTone} />
                          <ToneChip label={kindOf(ticket.kind).label} tone={kindOf(ticket.kind).tone} />
                          <StatusChip label={ticket.status} tone={statusOf(ticket.status).tone} size="small" />
                          <Typography variant="caption" noWrap sx={{ color: colors.textSecondary }}>
                            {ticket.ownerName}
                          </Typography>
                        </Stack>
                      </Box>

                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: tone.strong, flexShrink: 0 }}>
                        {due.late ? <TriangleAlert size={13} strokeWidth={2.25} /> : <Clock3 size={13} strokeWidth={1.75} />}
                        <Typography
                          variant="caption"
                          sx={{ color: 'inherit', fontWeight: due.late ? 700 : 500, whiteSpace: 'nowrap' }}
                        >
                          {due.text}
                        </Typography>
                      </Stack>
                      <ChevronRight size={15} strokeWidth={2} color={colors.textSecondary} aria-hidden="true" />
                    </Box>
                  )
                })
              )}
            </Box>

            {data.settledCount > 0 ? (
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  px: 1.75,
                  py: 1.125,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: `1px solid ${colors.border}`,
                  bgcolor: colors.page,
                }}
              >
                <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                  Settled in the last 30 days
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 650 }}>
                  {data.settledCount} · typically {data.settledAverage === 0 ? 'same day' : `${data.settledAverage} days`}
                </Typography>
              </Stack>
            ) : null}
          </>
        )}
      </QueryStateView>
    </SectionCard>
  )
}
