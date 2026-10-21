import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Box, Button, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material'
import {
  Building2,
  ChevronRight,
  Clock3,
  Inbox,
  LayoutList,
  Plus,
  Rows3,
  Tag,
  TriangleAlert,
  UserRound,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SectionCard } from '@/components/SectionCard'
import { StatCard } from '@/components/StatCard'
import { EmptyState } from '@/components/EmptyState'
import { QueryStateView } from '@/components/QueryStateView'
import { SearchField } from '@/components/SearchField'
import { ListSectionSkeleton, StatTileSkeleton } from '@/components/Skeletons'
import { StatusChip } from '@/components/StatusChip'
import { ToneChip } from '@/components/ToneChip'
import { clientService } from '@/api/clientService'
import { ticketService } from '@/api/ticketService'
import { PERMISSIONS } from '@/constants/permissions'
import { TICKET_KINDS, kindOf, roundLabel, statusOf } from '@/constants/clientDesk'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { useAsync } from '@/hooks/useAsync'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePermissions } from '@/hooks/usePermissions'
import { useWorkspace } from '@/hooks/useWorkspace'
import { colors, layout } from '@/theme/tokens'
import { daysUntil, formatDate } from '@/utils/date'
import { TicketDetailDrawer } from './TicketDetailDrawer'
import { TicketFormDialog } from './TicketFormDialog'
import { TicketTable } from './TicketTable'

const GAP = 1.5
const CONTROL_HEIGHT = 34

const VIEWS = [
  { key: 'list', label: 'List', icon: LayoutList },
  { key: 'table', label: 'Table', icon: Rows3 },
]

const TABS = [
  { key: 'open', label: 'Open', filters: { openOnly: 'true' }, count: (list) => list.filter((item) => item.isOpen).length },
  {
    key: 'overdue',
    label: 'Overdue',
    filters: { overdueOnly: 'true' },
    count: (list) => list.filter((item) => item.isOverdue).length,
  },
  {
    key: 'withclient',
    label: 'With client',
    filters: { status: 'With client' },
    count: (list) => list.filter((item) => item.status === 'With client').length,
  },
  {
    key: 'reopened',
    label: 'Came back',
    filters: { status: 'Reopened' },
    count: (list) => list.filter((item) => item.status === 'Reopened').length,
  },
  {
    key: 'completed',
    label: 'Completed',
    filters: { status: 'Completed' },
    count: (list) => list.filter((item) => item.status === 'Completed').length,
  },
  { key: 'all', label: 'Everything', filters: {}, count: (list) => list.length },
]

const TabPill = ({ label, count, active, onClick }) => (
  <Box
    component="button"
    type="button"
    onClick={onClick}
    aria-pressed={active}
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.625,
      height: CONTROL_HEIGHT,
      px: 1.375,
      flexShrink: 0,
      border: `1px solid ${active ? colors.brand : colors.border}`,
      borderRadius: 999,
      bgcolor: active ? colors.brand : colors.surface,
      color: active ? '#FFFFFF' : colors.textPrimary,
      font: 'inherit',
      fontSize: '0.8125rem',
      fontWeight: active ? 650 : 500,
      cursor: 'pointer',
      transition: 'background-color 120ms ease, border-color 120ms ease',
      '&:hover': { borderColor: active ? colors.brand : colors.textSecondary },
    }}
  >
    {label}
    {count > 0 ? (
      <Box
        component="span"
        sx={{
          minWidth: 18,
          px: 0.5,
          borderRadius: 999,
          bgcolor: active ? 'rgba(255, 255, 255, 0.24)' : colors.neutralSoft,
          color: active ? '#FFFFFF' : colors.textSecondary,
          fontSize: '0.6875rem',
          fontWeight: 700,
          lineHeight: '17px',
          textAlign: 'center',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {count}
      </Box>
    ) : null}
  </Box>
)

const FilterSelect = ({ icon: Icon, label, value, onChange, options, minWidth = 150 }) => (
  <TextField
    select
    size="small"
    value={value}
    onChange={(event) => onChange(event.target.value)}
    slotProps={{
      htmlInput: { 'aria-label': label },
      select: {
        displayEmpty: true,
        renderValue: (current) => (
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Icon size={14} strokeWidth={1.75} color={current ? colors.brand : colors.textSecondary} aria-hidden="true" />
            <Typography
              component="span"
              noWrap
              sx={{
                fontSize: '0.8125rem',
                fontWeight: current ? 600 : 500,
                color: current ? colors.textPrimary : colors.textSecondary,
              }}
            >
              {options.find((option) => option.value === current)?.label ?? label}
            </Typography>
          </Stack>
        ),
      },
    }}
    sx={{
      flex: { xs: '1 1 140px', sm: '0 0 auto' },
      minWidth: { sm: minWidth },
      '& .MuiOutlinedInput-root': {
        height: CONTROL_HEIGHT,
        borderRadius: 999,
        bgcolor: colors.surface,
        pr: 0.5,
      },
      '& .MuiOutlinedInput-notchedOutline': { borderColor: value ? colors.brand : colors.border },
      '& .MuiSelect-select': { display: 'flex', alignItems: 'center', py: 0, pl: 1.5 },
    }}
  >
    {options.map((option) => (
      <MenuItem key={option.value || 'any'} value={option.value} sx={{ fontSize: '0.8125rem' }}>
        {option.label}
      </MenuItem>
    ))}
  </TextField>
)

const dueLabel = (ticket) => {
  if (!ticket.dueDate) return { text: 'No due date', tone: 'gray', late: false }
  const diff = daysUntil(ticket.dueDate)
  if (!ticket.isOpen) return { text: formatDate(ticket.dueDate), tone: 'gray', late: false }
  if (diff < 0) return { text: `${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} late`, tone: 'rose', late: true }
  if (diff === 0) return { text: 'Due today', tone: 'amber', late: false }
  if (diff === 1) return { text: 'Due tomorrow', tone: 'amber', late: false }
  return { text: `Due in ${diff} days`, tone: 'slate', late: false }
}

const TicketRow = ({ ticket, onOpen }) => {
  const status = statusOf(ticket.status)
  const kind = kindOf(ticket.kind)
  const due = dueLabel(ticket)
  const dueTone = STATUS_TONES[due.tone]

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
      aria-label={`Open ticket ${ticket.token}`}
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr) auto', md: '96px minmax(0, 1fr) 150px 132px 20px' },
        alignItems: 'center',
        gap: { xs: 1, md: 1.5 },
        px: 1.75,
        py: 1.25,
        cursor: 'pointer',
        borderLeft: `3px solid ${ticket.isOverdue ? STATUS_TONES.rose.strong : 'transparent'}`,
        borderBottom: `1px solid ${colors.border}`,
        '&:last-of-type': { borderBottom: 0 },
        '&:hover': { bgcolor: colors.page },
        '&:focus-visible': { outline: 'none', boxShadow: `inset 0 0 0 2px ${colors.brand}` },
      }}
    >
      <Box
        sx={{
          display: { xs: 'none', md: 'block' },
          px: 0.875,
          py: 0.25,
          borderRadius: 1.5,
          bgcolor: colors.neutralSoft,
          color: colors.textPrimary,
          fontSize: '0.75rem',
          fontWeight: 800,
          letterSpacing: '0.02em',
          textAlign: 'center',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {ticket.token}
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Typography
            component="span"
            sx={{
              display: { md: 'none' },
              fontSize: '0.6875rem',
              fontWeight: 800,
              color: colors.textSecondary,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {ticket.token}
          </Typography>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
            {ticket.title}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} useFlexGap sx={{ mt: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <ToneChip label={ticket.clientName} tone={ticket.clientTone} />
          <ToneChip label={kind.label} tone={kind.tone} />
          {ticket.reopenCount > 0 ? <ToneChip label={roundLabel(ticket.reopenCount)} tone="orange" /> : null}
          <Typography variant="caption" noWrap sx={{ color: colors.textSecondary }}>
            {ticket.ownerName}
          </Typography>
        </Stack>
      </Box>

      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <StatusChip label={ticket.status} tone={status.tone} size="small" />
      </Box>

      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: dueTone.strong, flexShrink: 0 }}>
        {due.late ? <TriangleAlert size={13} strokeWidth={2.25} /> : <Clock3 size={13} strokeWidth={1.75} />}
        <Typography variant="caption" sx={{ color: 'inherit', fontWeight: due.late ? 700 : 500, whiteSpace: 'nowrap' }}>
          {due.text}
        </Typography>
      </Stack>

      <ChevronRight size={16} strokeWidth={2} color={colors.textSecondary} aria-hidden="true" />
    </Box>
  )
}

export const ClientDeskPage = () => {
  const { can } = usePermissions()
  const { activeWorkspaceId, activeWorkspace, assignableMembers } = useWorkspace()
  const canManage = can(PERMISSIONS.TICKET_MANAGE)
  const everyClient = can(PERMISSIONS.TICKET_MANAGE_ALL)

  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState(() => (TABS.some((item) => item.key === params.get('tab')) ? params.get('tab') : 'open'))
  const [view, setView] = useState('table')
  const [search, setSearch] = useState('')
  const [clientId, setClientId] = useState(() => params.get('clientId') ?? '')
  const [kind, setKind] = useState(() => params.get('kind') ?? '')
  const [ownerId, setOwnerId] = useState('')
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)

  const debouncedSearch = useDebouncedValue(search, 300)

  const clientArgs = useMemo(() => ({ assignedOnly: true }), [])
  const clients = useAsync(clientService.listClientOptions, [activeWorkspaceId, clientArgs], {
    enabled: Boolean(activeWorkspaceId),
  })

  const query = useMemo(
    () => ({
      workspaceId: activeWorkspaceId,
      search: debouncedSearch,
      clientId,
      kind,
      ownerId,
      ...(TABS.find((item) => item.key === tab)?.filters ?? {}),
    }),
    [activeWorkspaceId, debouncedSearch, clientId, kind, ownerId, tab],
  )

  const tickets = useAsync(ticketService.listTickets, [query], { enabled: Boolean(activeWorkspaceId) })
  const all = useAsync(ticketService.listTickets, [useMemo(() => ({ workspaceId: activeWorkspaceId }), [activeWorkspaceId])], {
    enabled: Boolean(activeWorkspaceId),
  })

  const items = tickets.data ?? []
  const everything = all.data ?? []
  const counts = {
    open: everything.filter((ticket) => ticket.isOpen).length,
    overdue: everything.filter((ticket) => ticket.isOverdue).length,
    waiting: everything.filter((ticket) => ticket.status === 'With client').length,
    reopened: everything.filter((ticket) => ticket.reopenCount > 0).length,
  }

  const deepLinked = params.get('ticket')
  const openTicket = selected ?? (deepLinked ? (everything.find((ticket) => ticket.id === deepLinked) ?? null) : null)

  const closeTicket = () => {
    setSelected(null)
    if (!deepLinked) return
    const next = new URLSearchParams(params)
    next.delete('ticket')
    setParams(next, { replace: true })
  }

  const refresh = (saved) => {
    tickets.reload()
    all.reload()
    if (saved?.id) setSelected(saved)
  }

  const clientOptions = clients.data ?? []

  const ownerFilterOptions = [
    { value: '', label: 'Anyone' },
    ...assignableMembers.map((member) => ({ value: member.employeeId, label: member.fullName })),
  ]
  const clientFilterOptions = [
    { value: '', label: 'All clients' },
    ...clientOptions.map((client) => ({ value: client.id, label: client.name })),
  ]
  const kindFilterOptions = [
    { value: '', label: 'Any type' },
    ...TICKET_KINDS.map((item) => ({ value: item.value, label: item.label })),
  ]

  const filtersOn = Boolean(ownerId || clientId || kind || search)
  const clearFilters = () => {
    setOwnerId('')
    setClientId('')
    setKind('')
    setSearch('')
  }

  return (
    <Box sx={{ maxWidth: layout.contentMaxWidth, mx: 'auto', px: { xs: 1.5, sm: 2, md: 3, lg: 4 }, py: { xs: 2, md: 3 } }}>
      <PageHeader
        title="Client Desk"
        description={
          everyClient
            ? `Every client in ${activeWorkspace?.name ?? 'this workspace'} — complaints, requirements and changes, each with its own token.`
            : 'What your clients asked for — complaints, requirements and changes, each with its own token.'
        }
        breadcrumbs={[{ label: 'Client Desk' }]}
        actions={
          canManage ? (
            <Tooltip
              title={
                clientOptions.length === 0
                  ? everyClient
                    ? 'Add a client first on the Clients page'
                    : 'No clients are assigned to you yet'
                  : ''
              }
            >
              <span>
                <Button
                  variant="contained"
                  disabled={clientOptions.length === 0}
                  startIcon={<Plus size={16} strokeWidth={2} />}
                  onClick={() => setCreating(true)}
                >
                  New ticket
                </Button>
              </span>
            </Tooltip>
          ) : null
        }
      />

      <Box sx={{ display: 'grid', gap: GAP, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, mb: GAP }}>
        {all.loading && !all.data ? (
          [0, 1, 2, 3].map((index) => <StatTileSkeleton key={index} />)
        ) : (
          <>
            <StatCard label="Open" value={counts.open} helperText="still with us" icon={Inbox} tone="blue" />
            <StatCard
              label="Overdue"
              value={counts.overdue}
              helperText={counts.overdue ? 'past the promised date' : 'all on time'}
              icon={counts.overdue ? TriangleAlert : Clock3}
              tone={counts.overdue ? 'rose' : 'teal'}
              emphasis={counts.overdue > 0}
            />
            <StatCard label="With client" value={counts.waiting} helperText="waiting on their check" icon={Clock3} tone="amber" />
            <StatCard label="Reopened" value={counts.reopened} helperText="went for another round" icon={Inbox} tone="orange" />
          </>
        )}
      </Box>

      <SectionCard padded={false} accent="blue">
        <Box sx={{ borderBottom: `1px solid ${colors.border}` }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.25}
            sx={{ px: { xs: 1.25, sm: 1.75 }, pt: 1.5, pb: 1.25, alignItems: { md: 'center' } }}
          >
            <Box
              sx={{
                display: 'flex',
                gap: 0.75,
                minWidth: 0,
                overflowX: 'auto',
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
              }}
            >
              {TABS.map((item) => (
                <TabPill
                  key={item.key}
                  label={item.label}
                  count={item.count(everything)}
                  active={tab === item.key}
                  onClick={() => setTab(item.key)}
                />
              ))}
            </Box>

            <Box sx={{ flex: 1 }} />

            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
              <Stack
                direction="row"
                sx={{
                  height: CONTROL_HEIGHT,
                  p: 0.375,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 999,
                  bgcolor: colors.page,
                  flexShrink: 0,
                }}
              >
                {VIEWS.map((item) => {
                  const active = view === item.key
                  const Icon = item.icon
                  return (
                    <Box
                      key={item.key}
                      component="button"
                      type="button"
                      onClick={() => setView(item.key)}
                      aria-pressed={active}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 1.25,
                        border: 0,
                        borderRadius: 999,
                        bgcolor: active ? colors.surface : 'transparent',
                        boxShadow: active ? '0 1px 2px rgba(15, 23, 42, 0.12)' : 'none',
                        color: active ? colors.textPrimary : colors.textSecondary,
                        font: 'inherit',
                        fontSize: '0.8125rem',
                        fontWeight: active ? 650 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      <Icon size={14} strokeWidth={2} aria-hidden="true" />
                      {item.label}
                    </Box>
                  )
                })}
              </Stack>

              <SearchField
                value={search}
                onChange={setSearch}
                label="Search tickets"
                placeholder="Token, heading or client…"
                sx={{
                  flex: { xs: 1, md: '0 0 auto' },
                  minWidth: { sm: 250 },
                  '& .MuiOutlinedInput-root': { height: CONTROL_HEIGHT, borderRadius: 999, bgcolor: colors.surface },
                  '& .MuiOutlinedInput-input': { fontSize: '0.8125rem' },
                }}
              />
            </Stack>
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ px: { xs: 1.25, sm: 1.75 }, pb: 1.5, alignItems: 'center', flexWrap: 'wrap' }}
          >
            {everyClient ? (
              <FilterSelect
                icon={UserRound}
                label="Anyone"
                value={ownerId}
                onChange={setOwnerId}
                options={ownerFilterOptions}
                minWidth={160}
              />
            ) : null}
            <FilterSelect
              icon={Building2}
              label="All clients"
              value={clientId}
              onChange={setClientId}
              options={clientFilterOptions}
              minWidth={170}
            />
            <FilterSelect icon={Tag} label="Any type" value={kind} onChange={setKind} options={kindFilterOptions} minWidth={150} />

            {filtersOn ? (
              <Button
                size="small"
                onClick={clearFilters}
                startIcon={<X size={14} strokeWidth={2} />}
                sx={{ height: CONTROL_HEIGHT, borderRadius: 999, px: 1.25, color: colors.textSecondary, fontSize: '0.8125rem' }}
              >
                Clear
              </Button>
            ) : null}

            <Box sx={{ flex: 1 }} />

            <Typography variant="caption" sx={{ color: colors.textSecondary, whiteSpace: 'nowrap' }}>
              {items.length} {items.length === 1 ? 'ticket' : 'tickets'}
            </Typography>
          </Stack>
        </Box>

        <QueryStateView error={tickets.error} onRetry={tickets.reload}>
          {tickets.loading && !tickets.data ? (
            <Box sx={{ p: 2 }}>
              <ListSectionSkeleton rows={5} wide />
            </Box>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={clientOptions.length === 0 && !everyClient ? 'No clients assigned to you yet' : 'Nothing here'}
              description={
                clientOptions.length === 0 && !everyClient
                  ? 'An admin assigns clients to you on the Clients page. Their tickets then show up here.'
                  : 'Nothing matches this filter. Try another tab or clear the search.'
              }
              actionLabel={canManage && clientOptions.length > 0 ? 'Raise a ticket' : undefined}
              onAction={canManage && clientOptions.length > 0 ? () => setCreating(true) : undefined}
            />
          ) : view === 'table' ? (
            <TicketTable tickets={items} onOpen={setSelected} />
          ) : (
            <>
              <Box
                sx={{
                  display: { xs: 'none', md: 'grid' },
                  gridTemplateColumns: '96px minmax(0, 1fr) 150px 132px 20px',
                  gap: 1.5,
                  px: 1.75,
                  py: 0.875,
                  pl: 2.125,
                  bgcolor: colors.page,
                  borderBottom: `1px solid ${colors.border}`,
                }}
              >
                {['Token', 'What the client asked', 'Status', 'Due', ''].map((head, index) => (
                  <Typography
                    key={head || index}
                    sx={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: colors.textSecondary,
                    }}
                  >
                    {head}
                  </Typography>
                ))}
              </Box>

              {items.map((ticket) => (
                <TicketRow key={ticket.id} ticket={ticket} onOpen={setSelected} />
              ))}
            </>
          )}
        </QueryStateView>
      </SectionCard>

      {openTicket ? (
        <TicketDetailDrawer
          ticket={openTicket}
          canManage={canManage}
          onClose={closeTicket}
          onChanged={refresh}
          onEdit={(ticket) => {
            closeTicket()
            setEditing(ticket)
          }}
        />
      ) : null}

      {creating || editing ? (
        <TicketFormDialog
          ticket={editing}
          clients={clientOptions}
          defaultClientId={clientId}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSaved={refresh}
        />
      ) : null}
    </Box>
  )
}
