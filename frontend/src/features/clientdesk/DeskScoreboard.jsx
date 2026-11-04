import {
  Box,
  ButtonBase,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import { UsersRound } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { ListSectionSkeleton } from '@/components/Skeletons'
import { QueryStateView } from '@/components/QueryStateView'
import { UserAvatar } from '@/components/UserAvatar'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { colors } from '@/theme/tokens'
import { buildDeskCounts } from './deskCountsData'

const HEAD = {
  fontSize: '0.6875rem',
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: colors.textSecondary,
  bgcolor: colors.page,
  whiteSpace: 'nowrap',
  px: 1,
}

const COLUMNS = [
  { key: 'clients', label: 'Clients', tone: 'violet', of: (person) => person.clients, group: 'book' },
  { key: 'Complaint', label: 'Feedback', tone: 'rose', of: (person) => person.kinds.Complaint, drill: { kind: 'Complaint' } },
  { key: 'Requirement', label: 'Requirements', tone: 'blue', of: (person) => person.kinds.Requirement, drill: { kind: 'Requirement' } },
  { key: 'Change', label: 'Changes', tone: 'amber', of: (person) => person.kinds.Change, drill: { kind: 'Change' } },
  {
    key: 'other',
    label: 'Other',
    tone: 'slate',
    of: (person) => (person.kinds['New request'] ?? 0) + (person.kinds.Other ?? 0),
    hideBelow: 'lg',
  },
  { key: 'open', label: 'Open', tone: 'blue', of: (person) => person.open, strong: true, drill: { tab: 'open' } },
  { key: 'overdue', label: 'Overdue', tone: 'rose', of: (person) => person.overdue, strong: true, drill: { tab: 'overdue' } },
  { key: 'completed', label: 'Completed', tone: 'green', of: (person) => person.completed, drill: { tab: 'completed' } },
]

const doneTone = (percent) => {
  if (percent === null) return 'slate'
  if (percent >= 80) return 'green'
  if (percent >= 50) return 'amber'
  return 'rose'
}

const DonePill = ({ percent }) => {
  const tone = STATUS_TONES[doneTone(percent)]
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        minWidth: 52,
        px: 0.875,
        py: 0.25,
        borderRadius: 1.5,
        bgcolor: percent === null ? 'transparent' : tone.soft,
        border: `1px solid ${percent === null ? colors.border : tone.border}`,
        color: percent === null ? colors.textSecondary : tone.strong,
        fontSize: '0.75rem',
        fontWeight: 700,
        textAlign: 'center',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {percent === null ? '—' : `${percent}%`}
    </Box>
  )
}

const Figure = ({ value, tone, strong, onDrill, label }) => {
  const palette = STATUS_TONES[tone]
  const number = (
    <Typography
      component="span"
      sx={{
        fontSize: '0.875rem',
        fontWeight: value > 0 ? (strong ? 800 : 700) : 400,
        color: value > 0 ? (strong ? colors.textPrimary : palette.strong) : colors.border,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {value > 0 ? value : '—'}
    </Typography>
  )

  if (value === 0 || !onDrill) return number

  return (
    <Tooltip title={label} enterDelay={400}>
      <ButtonBase
        onClick={onDrill}
        aria-label={label}
        sx={{ px: 0.75, py: 0.25, borderRadius: 1.5, '&:hover': { bgcolor: palette.soft }, '&:focus-visible': { bgcolor: palette.soft } }}
      >
        {number}
      </ButtonBase>
    </Tooltip>
  )
}

const Person = ({ person, size = 32 }) => (
  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
    <UserAvatar name={person.fullName} size={size} />
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" noWrap sx={{ fontWeight: 650, lineHeight: 1.3 }}>
        {person.fullName}
      </Typography>
      <Typography variant="caption" component="p" noWrap sx={{ color: colors.textSecondary }}>
        {person.designation || (person.clients > 0 ? 'Handles clients' : 'No clients now')}
        {person.primary > 0 ? ` · lead for ${person.primary}` : ''}
      </Typography>
    </Box>
  </Stack>
)

const PersonCard = ({ person, columns, onDrill }) => (
  <Box sx={{ px: 1.75, py: 1.5, borderBottom: `1px solid ${colors.border}` }}>
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Person person={person} />
      </Box>
      <DonePill percent={person.doneRate} />
    </Stack>
    <Box sx={{ mt: 1.25, display: 'grid', gap: 0.75, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
      {columns.map((column) => (
        <Box
          key={column.key}
          sx={{
            px: 0.75,
            py: 0.75,
            borderRadius: 1.5,
            bgcolor: colors.page,
            border: `1px solid ${colors.border}`,
            textAlign: 'center',
          }}
        >
          <Figure
            value={column.of(person)}
            tone={column.tone}
            strong={column.strong}
            label={`${column.label} — ${person.fullName}`}
            onDrill={column.drill ? () => onDrill({ ownerId: person.id, ...column.drill }) : null}
          />
          <Typography
            variant="caption"
            component="p"
            noWrap
            sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: colors.textSecondary }}
          >
            {column.label}
          </Typography>
        </Box>
      ))}
    </Box>
  </Box>
)

export const DeskScoreboard = ({ clients, tickets, loading, error, onRetry, onDrill, search = '' }) => {
  const board = buildDeskCounts(clients, tickets)
  const term = search.trim().toLowerCase()
  const rows = term ? board.rows.filter((person) => person.fullName.toLowerCase().includes(term)) : board.rows

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <ListSectionSkeleton rows={5} wide />
      </Box>
    )
  }

  return (
    <QueryStateView error={error} onRetry={onRetry}>
      {board.rows.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="Nobody is handling clients yet"
          description="Assign people to clients on the Clients page and their counts will show up here."
        />
      ) : rows.length === 0 ? (
        <EmptyState icon={UsersRound} title="No one by that name" description="Clear the search to see everyone again." />
      ) : (
        <>
          <Stack
            direction="row"
            spacing={0.75}
            useFlexGap
            sx={{ px: 1.75, py: 1.25, alignItems: 'center', flexWrap: 'wrap', borderBottom: `1px solid ${colors.border}` }}
          >
            <Typography variant="caption" sx={{ color: colors.textSecondary }}>
              <strong>{board.rows.length}</strong> {board.rows.length === 1 ? 'person' : 'people'} ·{' '}
              <strong>{board.distinctClients}</strong> {board.distinctClients === 1 ? 'client' : 'clients'} handled ·{' '}
              <strong>{board.totals.total}</strong> {board.totals.total === 1 ? 'ticket' : 'tickets'} ·{' '}
              <strong>{board.totals.completed}</strong> completed
            </Typography>
            <Box sx={{ flex: 1 }} />
            {board.unhandledClients > 0 ? (
              <Typography variant="caption" sx={{ color: STATUS_TONES.amber.strong, fontWeight: 600 }}>
                {board.unhandledClients} {board.unhandledClients === 1 ? 'client has' : 'clients have'} nobody
              </Typography>
            ) : null}
            {board.unowned > 0 ? (
              <Typography variant="caption" sx={{ color: STATUS_TONES.rose.strong, fontWeight: 600 }}>
                {board.unowned} unassigned {board.unowned === 1 ? 'ticket' : 'tickets'}
              </Typography>
            ) : null}
          </Stack>

          <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
            <Table size="small" sx={{ minWidth: 880, '& td, & th': { borderColor: colors.border } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...HEAD, minWidth: 200, pl: 1.75 }}>Person</TableCell>
                  {COLUMNS.map((column) => (
                    <TableCell
                      key={column.key}
                      align="right"
                      sx={{
                        ...HEAD,
                        width: 96,
                        ...(column.hideBelow ? { display: { xs: 'none', [column.hideBelow]: 'table-cell' } } : {}),
                      }}
                    >
                      {column.label}
                    </TableCell>
                  ))}
                  <TableCell align="right" sx={{ ...HEAD, width: 92, pr: 1.75 }}>
                    Done
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((person) => (
                  <TableRow key={person.id} hover>
                    <TableCell sx={{ pl: 1.75 }}>
                      <Person person={person} />
                    </TableCell>
                    {COLUMNS.map((column) => (
                      <TableCell
                        key={column.key}
                        align="right"
                        sx={column.hideBelow ? { display: { xs: 'none', [column.hideBelow]: 'table-cell' } } : undefined}
                      >
                        <Figure
                          value={column.of(person)}
                          tone={column.tone}
                          strong={column.strong}
                          label={`${column.label} — ${person.fullName}`}
                          onDrill={column.drill ? () => onDrill({ ownerId: person.id, ...column.drill }) : null}
                        />
                      </TableCell>
                    ))}
                    <TableCell align="right" sx={{ pr: 1.75 }}>
                      <DonePill percent={person.doneRate} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow sx={{ bgcolor: colors.page }}>
                  <TableCell sx={{ pl: 1.75, borderBottom: 0 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: colors.textPrimary }}>
                      Everyone
                    </Typography>
                  </TableCell>
                  {COLUMNS.map((column) => (
                    <TableCell
                      key={column.key}
                      align="right"
                      sx={{
                        borderBottom: 0,
                        fontWeight: 700,
                        color: colors.textPrimary,
                        fontVariantNumeric: 'tabular-nums',
                        ...(column.hideBelow ? { display: { xs: 'none', [column.hideBelow]: 'table-cell' } } : {}),
                      }}
                    >
                      {column.group === 'book' ? board.distinctClients : column.of(board.totals)}
                    </TableCell>
                  ))}
                  <TableCell align="right" sx={{ pr: 1.75, borderBottom: 0 }}>
                    <DonePill percent={board.totals.doneRate} />
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </TableContainer>

          <Box sx={{ display: { xs: 'block', md: 'none' } }}>
            {rows.map((person) => (
              <PersonCard key={person.id} person={person} columns={COLUMNS} onDrill={onDrill} />
            ))}
          </Box>
        </>
      )}
    </QueryStateView>
  )
}
