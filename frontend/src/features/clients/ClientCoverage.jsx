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
import { ArrowRight, Building2, Crown, Headset, UserPlus } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { QueryStateView } from '@/components/QueryStateView'
import { TableSkeleton } from '@/components/TableSkeleton'
import { ToneChip } from '@/components/ToneChip'
import { UserAvatar } from '@/components/UserAvatar'
import { ROUTES, withFilters } from '@/constants/routes'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { colors } from '@/theme/tokens'
import { pluralize } from '@/utils/format'
import { buildCoverage } from './clientCoverageData'

const HEAD = {
  fontSize: '0.6875rem',
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  color: colors.textSecondary,
  bgcolor: colors.page,
}

const CELL = { verticalAlign: 'middle', py: 1.25 }

const STATUS_TONE = { Active: 'green', 'On hold': 'amber', Prospect: 'blue' }

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

const Count = ({ value, tone = 'blue' }) => (
  <Box
    sx={{
      display: 'inline-block',
      minWidth: 26,
      px: 0.875,
      py: 0.125,
      borderRadius: 999,
      bgcolor: value > 0 ? STATUS_TONES[tone].soft : colors.neutralSoft,
      color: value > 0 ? STATUS_TONES[tone].strong : colors.textSecondary,
      fontSize: '0.75rem',
      fontWeight: 700,
      textAlign: 'center',
    }}
  >
    {value}
  </Box>
)

/** One person's full book of clients, a row each. */
const PersonBook = ({ person, openTickets, canSeeTickets, onClear, ownBook }) => (
  <>
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      sx={{
        m: 2,
        p: 1.75,
        alignItems: { sm: 'center' },
        border: `1px solid ${colors.border}`,
        borderRadius: 2.5,
        bgcolor: colors.page,
      }}
    >
      <UserAvatar name={person.fullName} size={48} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h3" component="p" sx={{ fontSize: '1.0625rem', lineHeight: 1.3 }}>
          {ownBook ? `${person.fullName} — handled by you` : person.fullName}
        </Typography>
        <Typography variant="caption" sx={{ color: colors.textSecondary }}>
          {person.designation} · handles {pluralize(person.clients.length, 'client')}
          {person.leadFor.length > 0 ? ` · first contact for ${person.leadFor.length}` : ''}
        </Typography>
      </Box>
      {ownBook ? null : (
        <Button size="small" variant="outlined" onClick={onClear}>
          Show everyone
        </Button>
      )}
    </Stack>

    <TableContainer>
      <Table size="small" sx={{ minWidth: 760 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ ...HEAD, width: 56, pl: 2 }}>S.No</TableCell>
            <TableCell sx={{ ...HEAD, minWidth: 180 }}>Client</TableCell>
            <TableCell sx={{ ...HEAD, minWidth: 160 }}>Company</TableCell>
            <TableCell sx={{ ...HEAD, width: 120 }}>Status</TableCell>
            <TableCell sx={{ ...HEAD, width: 140 }}>Their role</TableCell>
            {canSeeTickets ? (
              <TableCell sx={{ ...HEAD, width: 120 }} align="right">
                Open tickets
              </TableCell>
            ) : null}
            {canSeeTickets ? <TableCell sx={{ ...HEAD, width: 56, pr: 2 }} /> : null}
          </TableRow>
        </TableHead>
        <TableBody>
          {person.clients.map((client, index) => {
            const isLead = person.leadFor.some((entry) => entry.id === client.id)
            const open = openTickets?.get(client.id) ?? 0

            return (
              <TableRow
                key={client.id}
                hover
                component={canSeeTickets ? Link : 'tr'}
                to={canSeeTickets ? withFilters(ROUTES.clientDesk, { clientId: client.id }) : undefined}
                sx={{
                  textDecoration: 'none',
                  color: 'inherit',
                  cursor: canSeeTickets ? 'pointer' : 'default',
                  display: 'table-row',
                }}
              >
                <TableCell sx={{ ...CELL, pl: 2 }}>
                  <Typography variant="caption" sx={{ color: colors.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                    {index + 1}
                  </Typography>
                </TableCell>

                <TableCell sx={CELL}>
                  <ToneChip label={client.name} tone={client.tone} size="medium" />
                </TableCell>

                <TableCell sx={CELL}>
                  <Typography variant="body2" noWrap sx={{ color: client.company ? colors.textPrimary : colors.textSecondary }}>
                    {client.company || '—'}
                  </Typography>
                </TableCell>

                <TableCell sx={CELL}>
                  <ToneChip label={client.status ?? 'Active'} tone={STATUS_TONE[client.status] ?? 'slate'} />
                </TableCell>

                <TableCell sx={CELL}>
                  {isLead ? (
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: STATUS_TONES.amber.strong }}>
                      <Crown size={12} strokeWidth={2} aria-hidden="true" />
                      <Typography variant="caption" sx={{ color: 'inherit', fontWeight: 650 }}>
                        First contact
                      </Typography>
                    </Stack>
                  ) : (
                    <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                      Also handles
                    </Typography>
                  )}
                </TableCell>

                {canSeeTickets ? (
                  <TableCell align="right" sx={CELL}>
                    <Count value={open} tone={open > 0 ? 'blue' : 'gray'} />
                  </TableCell>
                ) : null}

                {canSeeTickets ? (
                  <TableCell sx={{ ...CELL, pr: 2 }} align="right">
                    <ArrowRight size={15} strokeWidth={2} color={colors.textSecondary} aria-hidden="true" />
                  </TableCell>
                ) : null}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  </>
)

export const ClientCoverage = ({
  clients,
  loading,
  error,
  onRetry,
  onPickClient,
  onPickPerson,
  canAssign,
  canSeeTickets,
  ownBookOnly = false,
  focusClientId = '',
  focusPersonId = '',
  openTickets,
  onClearFocus,
}) => {
  const coverage = buildCoverage(clients)
  const focusPerson = focusPersonId ? (coverage.people.find((person) => person.id === focusPersonId) ?? null) : null
  const focusClient = focusClientId ? (clients.find((client) => client.id === focusClientId) ?? null) : null

  const people = focusClient
    ? coverage.people
        .filter((person) => person.clients.some((client) => client.id === focusClient.id))
        .sort((a, b) => {
          const aLead = a.leadFor.some((client) => client.id === focusClient.id)
          const bLead = b.leadFor.some((client) => client.id === focusClient.id)
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
      ) : coverage.total === 0 || (ownBookOnly && !focusPerson) ? (
        <EmptyState
          icon={ownBookOnly ? Headset : Building2}
          title={ownBookOnly ? 'No clients assigned to you yet' : 'No clients yet'}
          description={
            ownBookOnly
              ? 'An admin assigns clients to you on this page. Yours will show up here with their open tickets.'
              : 'Add a client, then say who handles them.'
          }
        />
      ) : focusPerson ? (
        <PersonBook
          person={focusPerson}
          openTickets={openTickets}
          canSeeTickets={canSeeTickets}
          onClear={onClearFocus}
          ownBook={ownBookOnly}
        />
      ) : (
        <>
          {focusClient ? (
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
              <ToneChip label={focusClient.name} tone={focusClient.tone} size="medium" />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 650 }}>
                  {people.length === 0
                    ? 'Nobody handles this client yet'
                    : `Handled by ${pluralize(people.length, 'person', 'people')}`}
                </Typography>
                <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                  {focusClient.company ? `${focusClient.company} · ` : ''}
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
              title={focusClient ? `Nobody handles ${focusClient.name} yet` : 'Nobody is handling a client yet'}
              description="Open the client and pick who handles them. They then see that client's tickets on the Client Desk."
              actionLabel={focusClient && canAssign ? 'Assign someone' : undefined}
              onAction={focusClient && canAssign ? () => onPickClient(focusClient) : undefined}
            />
          ) : (
            <TableContainer>
              <Table size="small" sx={{ minWidth: 820 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ ...HEAD, width: 56, pl: 2 }}>S.No</TableCell>
                    <TableCell sx={{ ...HEAD, minWidth: 200 }}>Person</TableCell>
                    <TableCell sx={{ ...HEAD, minWidth: 150 }}>Designation</TableCell>
                    <TableCell sx={{ ...HEAD, width: 90 }} align="right">
                      Clients
                    </TableCell>
                    <TableCell sx={{ ...HEAD, minWidth: 260 }}>{focusClient ? 'Also handles' : 'Handles'}</TableCell>
                    <TableCell sx={{ ...HEAD, minWidth: 150, pr: 2 }}>First contact for</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {people.map((person, index) => (
                    <TableRow
                      key={person.id}
                      hover
                      onClick={() => onPickPerson(person.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell sx={{ ...CELL, pl: 2 }}>
                        <Typography variant="caption" sx={{ color: colors.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                          {index + 1}
                        </Typography>
                      </TableCell>

                      <TableCell sx={CELL}>
                        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
                          <UserAvatar name={person.fullName} size={30} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" noWrap sx={{ fontWeight: 650 }}>
                              {person.fullName}
                            </Typography>
                            {focusClient && person.leadFor.some((client) => client.id === focusClient.id) ? (
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

                      <TableCell sx={CELL}>
                        <Typography variant="caption">{person.designation}</Typography>
                      </TableCell>

                      <TableCell align="right" sx={CELL}>
                        <Count value={person.clients.length} />
                      </TableCell>

                      <TableCell sx={CELL}>
                        {(() => {
                          const shown = focusClient
                            ? person.clients.filter((client) => client.id !== focusClient.id)
                            : person.clients
                          if (shown.length === 0) {
                            return (
                              <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                                Only this client
                              </Typography>
                            )
                          }
                          return (
                            <Stack direction="row" spacing={0.625} useFlexGap sx={{ flexWrap: 'wrap' }}>
                              {shown.slice(0, 4).map((client) => (
                                <ClientChip key={client.id} client={client} canSeeTickets={canSeeTickets} />
                              ))}
                              {shown.length > 4 ? (
                                <Typography variant="caption" sx={{ color: colors.textSecondary, alignSelf: 'center' }}>
                                  +{shown.length - 4} more
                                </Typography>
                              ) : null}
                            </Stack>
                          )
                        })()}
                      </TableCell>

                      <TableCell sx={{ ...CELL, pr: 2 }}>
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

          {!focusClient && coverage.unassigned.length > 0 ? (
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
