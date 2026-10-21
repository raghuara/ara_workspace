import {
  Box,
  Button,
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
import { Link } from 'react-router-dom'
import { Building2, Crown, Headset, UserPlus } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { QueryStateView } from '@/components/QueryStateView'
import { TableSkeleton } from '@/components/TableSkeleton'
import { ToneChip } from '@/components/ToneChip'
import { UserAvatar } from '@/components/UserAvatar'
import { ROUTES, withFilters } from '@/constants/routes'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { colors } from '@/theme/tokens'
import { pluralize } from '@/utils/format'

const HEAD = {
  fontSize: '0.6875rem',
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  color: colors.textSecondary,
  bgcolor: colors.page,
}

const buildCoverage = (clients) => {
  const people = new Map()
  const unassigned = []

  clients.forEach((client) => {
    const assignees = client.assignees ?? []
    if (assignees.length === 0) {
      unassigned.push(client)
      return
    }
    assignees.forEach((person) => {
      const entry = people.get(person.id) ?? { ...person, clients: [], leadFor: [] }
      entry.clients.push(client)
      if (person.isPrimary) entry.leadFor.push(client)
      people.set(person.id, entry)
    })
  })

  return {
    people: [...people.values()].sort(
      (a, b) => b.clients.length - a.clients.length || a.fullName.localeCompare(b.fullName),
    ),
    unassigned,
    total: clients.length,
  }
}

const Headline = ({ value, label, tone }) => (
  <Box sx={{ px: 1.5, py: 1, borderRadius: 2, bgcolor: STATUS_TONES[tone].soft, minWidth: 0 }}>
    <Typography sx={{ fontSize: '1.25rem', fontWeight: 750, lineHeight: 1.1, color: STATUS_TONES[tone].strong }}>
      {value}
    </Typography>
    <Typography variant="caption" noWrap sx={{ color: STATUS_TONES[tone].strong }}>
      {label}
    </Typography>
  </Box>
)

const ClientChip = ({ client, canSeeTickets }) =>
  canSeeTickets ? (
    <Tooltip title={`Open ${client.name}'s tickets`}>
      <Box component={Link} to={withFilters(ROUTES.clientDesk, { clientId: client.id })} sx={{ textDecoration: 'none' }}>
        <ToneChip label={client.name} tone={client.tone} />
      </Box>
    </Tooltip>
  ) : (
    <ToneChip label={client.name} tone={client.tone} />
  )

export const ClientCoverage = ({
  clients,
  loading,
  error,
  onRetry,
  onPickClient,
  canAssign,
  canSeeTickets,
  focusClientId = '',
  onClearFocus,
}) => {
  const coverage = buildCoverage(clients)
  const focus = focusClientId ? (clients.find((client) => client.id === focusClientId) ?? null) : null
  const people = focus
    ? coverage.people
        .filter((person) => person.clients.some((client) => client.id === focus.id))
        .sort((a, b) => {
          const aLead = a.leadFor.some((client) => client.id === focus.id)
          const bLead = b.leadFor.some((client) => client.id === focus.id)
          if (aLead !== bLead) return aLead ? -1 : 1
          return a.fullName.localeCompare(b.fullName)
        })
    : coverage.people

  return (
    <QueryStateView error={error} onRetry={onRetry}>
      {loading ? (
        <TableContainer>
          <Table size="small">
            <TableSkeleton rows={5} columns={5} />
          </Table>
        </TableContainer>
      ) : coverage.total === 0 ? (
        <EmptyState icon={Building2} title="No clients yet" description="Add a client, then say who handles them." />
      ) : (
        <>
          {focus ? (
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.25}
              sx={{
                m: 2,
                p: 1.5,
                alignItems: { sm: 'center' },
                border: `1px solid ${STATUS_TONES.blue.border}`,
                borderRadius: 2.5,
                bgcolor: STATUS_TONES.blue.soft,
              }}
            >
              <ToneChip label={focus.name} tone={focus.tone} size="medium" />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 650 }}>
                  {people.length === 0 ? 'Nobody handles this client yet' : `Handled by ${pluralize(people.length, 'person', 'people')}`}
                </Typography>
                <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                  {focus.company ? `${focus.company} · ` : ''}
                  {people.length > 0 ? `First contact: ${people[0].fullName}` : 'Tickets stay with whoever raises them.'}
                </Typography>
              </Box>
              <Button size="small" variant="text" onClick={onClearFocus}>
                Show everyone
              </Button>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1} useFlexGap sx={{ px: 2, pt: 2, pb: 1.5, flexWrap: 'wrap' }}>
              <Headline value={coverage.total} label={pluralize(coverage.total, 'client')} tone="slate" />
              <Headline value={coverage.people.length} label="people handling them" tone="blue" />
              <Headline
                value={coverage.unassigned.length}
                label="with nobody"
                tone={coverage.unassigned.length > 0 ? 'rose' : 'green'}
              />
            </Stack>
          )}

          {people.length === 0 ? (
            <EmptyState
              icon={Headset}
              title={focus ? `Nobody handles ${focus.name} yet` : 'Nobody is handling a client yet'}
              description="Open the client and pick who handles them. They then see that client's tickets on the Client Desk."
              actionLabel={focus && canAssign ? 'Assign someone' : undefined}
              onAction={focus && canAssign ? () => onPickClient(focus) : undefined}
            />
          ) : (
            <TableContainer>
              <Table size="small" sx={{ minWidth: 820 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ ...HEAD, width: 56 }}>S.No</TableCell>
                    <TableCell sx={{ ...HEAD, minWidth: 200 }}>Person</TableCell>
                    <TableCell sx={{ ...HEAD, minWidth: 150 }}>Designation</TableCell>
                    <TableCell sx={{ ...HEAD, width: 90 }} align="right">
                      Clients
                    </TableCell>
                    <TableCell sx={{ ...HEAD, minWidth: 260 }}>{focus ? 'Also handles' : 'Handles'}</TableCell>
                    <TableCell sx={{ ...HEAD, minWidth: 150 }}>First contact for</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {people.map((person, index) => (
                    <TableRow key={person.id} hover>
                      <TableCell sx={{ verticalAlign: 'top', py: 1.25 }}>
                        <Typography variant="caption" sx={{ color: colors.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                          {index + 1}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ verticalAlign: 'top', py: 1.25 }}>
                        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
                          <UserAvatar name={person.fullName} size={30} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" noWrap sx={{ fontWeight: 650 }}>
                              {person.fullName}
                            </Typography>
                            {focus && person.leadFor.some((client) => client.id === focus.id) ? (
                              <Stack direction="row" spacing={0.375} sx={{ alignItems: 'center', color: STATUS_TONES.amber.strong }}>
                                <Crown size={11} strokeWidth={2} aria-hidden="true" />
                                <Typography variant="caption" sx={{ color: 'inherit', fontWeight: 650 }}>
                                  First contact
                                </Typography>
                              </Stack>
                            ) : null}
                          </Box>
                        </Stack>
                      </TableCell>

                      <TableCell sx={{ verticalAlign: 'top', py: 1.25 }}>
                        <Typography variant="caption">{person.designation}</Typography>
                      </TableCell>

                      <TableCell align="right" sx={{ verticalAlign: 'top', py: 1.25 }}>
                        <Box
                          sx={{
                            display: 'inline-block',
                            minWidth: 26,
                            px: 0.875,
                            py: 0.125,
                            borderRadius: 999,
                            bgcolor: STATUS_TONES.blue.soft,
                            color: STATUS_TONES.blue.strong,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          {person.clients.length}
                        </Box>
                      </TableCell>

                      <TableCell sx={{ verticalAlign: 'top', py: 1.25 }}>
                        {(() => {
                          const shown = focus ? person.clients.filter((client) => client.id !== focus.id) : person.clients
                          if (shown.length === 0) {
                            return (
                              <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                                Only this client
                              </Typography>
                            )
                          }
                          return (
                            <Stack direction="row" spacing={0.625} useFlexGap sx={{ flexWrap: 'wrap' }}>
                              {shown.map((client) => (
                                <ClientChip key={client.id} client={client} canSeeTickets={canSeeTickets} />
                              ))}
                            </Stack>
                          )
                        })()}
                      </TableCell>

                      <TableCell sx={{ verticalAlign: 'top', py: 1.25 }}>
                        {person.leadFor.length === 0 ? (
                          <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                            —
                          </Typography>
                        ) : (
                          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: STATUS_TONES.amber.strong }}>
                            <Crown size={12} strokeWidth={2} aria-hidden="true" />
                            <Tooltip title={person.leadFor.map((client) => client.name).join(', ')}>
                              <Typography variant="caption" sx={{ color: 'inherit', fontWeight: 650 }}>
                                {pluralize(person.leadFor.length, 'client')}
                              </Typography>
                            </Tooltip>
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {!focus && coverage.unassigned.length > 0 ? (
            <Box
              sx={{
                m: 2,
                p: 1.75,
                border: `1px solid ${STATUS_TONES.amber.border}`,
                borderRadius: 2.5,
                bgcolor: STATUS_TONES.amber.soft,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 650, color: STATUS_TONES.amber.strong }}>
                Nobody handles {pluralize(coverage.unassigned.length, 'client')} yet
              </Typography>
              <Typography variant="caption" sx={{ color: STATUS_TONES.amber.strong }}>
                {canAssign
                  ? 'Tap one to find it in the list and pick who handles it.'
                  : 'Their tickets stay with whoever raises them until someone is named.'}
              </Typography>

              <Stack direction="row" spacing={0.625} useFlexGap sx={{ mt: 1.25, flexWrap: 'wrap' }}>
                {coverage.unassigned.map((client) =>
                  canAssign ? (
                    <Button
                      key={client.id}
                      size="small"
                      variant="outlined"
                      startIcon={<UserPlus size={13} strokeWidth={2} />}
                      onClick={() => onPickClient(client)}
                      sx={{
                        height: 30,
                        borderRadius: 999,
                        bgcolor: colors.surface,
                        borderColor: STATUS_TONES.amber.border,
                        color: colors.textPrimary,
                        fontSize: '0.75rem',
                      }}
                    >
                      {client.name}
                    </Button>
                  ) : (
                    <ToneChip key={client.id} label={client.name} tone={client.tone} />
                  ),
                )}
              </Stack>
            </Box>
          ) : null}
        </>
      )}
    </QueryStateView>
  )
}
