import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { Building2, Pencil, Plus, Rows3, Trash2, UserPlus, Users } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SearchField } from '@/components/SearchField'
import { EmptyState } from '@/components/EmptyState'
import { QueryStateView } from '@/components/QueryStateView'
import { TableSkeleton } from '@/components/TableSkeleton'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ToneChip } from '@/components/ToneChip'
import { PeoplePicker } from '@/components/PeoplePicker'
import { TonePicker } from '@/components/TonePicker'
import { colors } from '@/theme/tokens'
import { UserAvatar } from '@/components/UserAvatar'
import { clientService } from '@/api/clientService'
import { isForbidden } from '@/api/httpClient'
import { PERMISSIONS } from '@/constants/permissions'
import { useAsync } from '@/hooks/useAsync'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePermissions } from '@/hooks/usePermissions'
import { useSubmit } from '@/hooks/useSubmit'
import { useWorkspace } from '@/hooks/useWorkspace'
import { layout } from '@/theme/tokens'
import { pluralize } from '@/utils/format'
import { ClientCoverage } from './ClientCoverage'

const STATUSES = ['Active', 'On hold', 'Prospect', 'Closed']

const VIEWS = [
  { key: 'list', label: 'Clients', icon: Rows3 },
  { key: 'coverage', label: 'Who handles what', icon: Users },
]

const HandledBy = ({ client, canAssign, onAssign }) => {
  const people = client.assignees ?? []

  if (people.length === 0) {
    return canAssign ? (
      <Button
        size="small"
        variant="text"
        startIcon={<UserPlus size={14} strokeWidth={2} />}
        onClick={onAssign}
        sx={{ color: colors.textSecondary, fontSize: '0.75rem', px: 0.75 }}
      >
        Assign someone
      </Button>
    ) : (
      <Typography variant="caption" sx={{ color: colors.textSecondary }}>
        Nobody yet
      </Typography>
    )
  }

  const [lead, ...rest] = people

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
      <Tooltip title={`${lead.fullName} · ${lead.designation} · first contact`}>
        <Box sx={{ display: 'inline-flex' }}>
          <UserAvatar name={lead.fullName} size={28} />
        </Box>
      </Tooltip>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 600, lineHeight: 1.3 }}>
          {lead.fullName}
        </Typography>
        <Typography variant="caption" component="p" noWrap sx={{ color: colors.textSecondary }}>
          {rest.length > 0 ? `+${rest.length} more` : lead.designation}
        </Typography>
      </Box>
      {rest.length > 0 ? (
        <Tooltip title={rest.map((person) => person.fullName).join(', ')}>
          <Stack direction="row" spacing={-0.75} sx={{ alignItems: 'center', pl: 0.25 }}>
            {rest.slice(0, 2).map((person) => (
              <Box key={person.id} sx={{ display: 'inline-flex', ml: -0.75, '&:first-of-type': { ml: 0 } }}>
                <UserAvatar name={person.fullName} size={24} />
              </Box>
            ))}
          </Stack>
        </Tooltip>
      ) : null}
    </Stack>
  )
}

const ClientFormDialog = ({ client, workspaceId, onClose, onSaved }) => {
  const isEditing = Boolean(client)
  const { assignableMembers } = useWorkspace()
  const [values, setValues] = useState(() => ({
    name: client?.name ?? '',
    company: client?.company ?? '',
    contactName: client?.contactName ?? '',
    email: client?.email ?? '',
    phone: client?.phone ?? '',
    status: client?.status ?? 'Active',
    tone: client?.tone ?? 'blue',
    assigneeIds: client?.assigneeIds ?? [],
  }))
  const [errors, setErrors] = useState({})

  const { submit, submitting, error } = useSubmit((payload) =>
    isEditing ? clientService.updateClient(client.id, payload) : clientService.createClient(payload),
  )

  const setField = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const validation = {}
    if (!values.name.trim()) validation.name = 'A client name is required.'
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email))
      validation.email = 'Enter a valid email address.'
    setErrors(validation)
    if (Object.keys(validation).length > 0) return

    const saved = await submit({ ...values, workspaceId })
    if (saved) {
      onSaved()
      onClose()
    }
  }

  const field = (name, label, extra = {}) => ({
    label,
    value: values[name],
    onChange: setField(name),
    error: Boolean(errors[name]),
    helperText: errors[name] ?? ' ',
    size: 'small',
    fullWidth: true,
    ...extra,
  })

  return (
    <Dialog open onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600 }}>{isEditing ? 'Edit client' : 'Add client'}</DialogTitle>
        <DialogContent dividers>
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {isForbidden(error) ? 'You do not have permission to manage clients.' : error.message}
            </Alert>
          ) : null}

          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, pt: 1 }}>
            <TextField {...field('name', 'Client name', { required: true, autoFocus: true })} />
            <TextField {...field('company', 'Company')} />
            <TextField {...field('contactName', 'Contact person')} />
            <TextField {...field('email', 'Email', { type: 'email' })} />
            <TextField {...field('phone', 'Phone')} />
            <TextField {...field('status', 'Status', { select: true })}>
              {STATUSES.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Box sx={{ mb: 2 }}>
            <PeoplePicker
              label="Followed by"
              options={assignableMembers.map((member) => ({ ...member, id: member.employeeId }))}
              multiple
              value={values.assigneeIds}
              onChange={(next) => setValues((current) => ({ ...current, assigneeIds: next }))}
              helperText="These people see this client in Client Desk and can raise tickets for it."
            />
          </Box>

          <TonePicker
            value={values.tone}
            onChange={(tone) => setValues((current) => ({ ...current, tone }))}
            previewLabel={values.name}
            helperText="Used on task cards so this client is recognisable at a glance."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={onClose} variant="outlined" disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Add client'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

export const ClientsPage = () => {
  const { can } = usePermissions()
  const { activeWorkspaceId, activeWorkspace, refreshStructure } = useWorkspace()

  const [view, setView] = useState('list')
  const [coverageClientId, setCoverageClientId] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [formClient, setFormClient] = useState(undefined)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState('')

  const debouncedSearch = useDebouncedValue(search, 300)

  const query = useMemo(
    () => ({ workspaceId: activeWorkspaceId, search: debouncedSearch, status, page: page + 1, pageSize }),
    [activeWorkspaceId, debouncedSearch, status, page, pageSize],
  )

  const { data, loading, error, reload } = useAsync(clientService.listClients, [query], {
    enabled: Boolean(activeWorkspaceId),
  })

  const coverage = useAsync(clientService.listClientOptions, [activeWorkspaceId], {
    enabled: Boolean(activeWorkspaceId) && view === 'coverage',
  })

  const refresh = () => {
    reload()
    coverage.reload()
    refreshStructure()
  }

  const findInList = (client) => {
    setView('list')
    setSearch(client.name)
    setPage(0)
  }

  const confirmDelete = async () => {
    setDeleteError('')
    try {
      await clientService.deleteClient(deleteTarget.id)
      setDeleteTarget(null)
      refresh()
    } catch (caught) {
      setDeleteError(caught.message ?? 'The client could not be deleted.')
    }
  }

  return (
    <Box sx={{ maxWidth: layout.contentMaxWidth, mx: 'auto', px: { xs: 2, md: 3, lg: 4 }, py: { xs: 3, md: 4 } }}>
      <PageHeader
        title="Clients"
        description={`Client directory for ${activeWorkspace?.name ?? 'this workspace'}. Tasks are filed and filtered against these.`}
        breadcrumbs={[{ label: 'Clients' }]}
        actions={
          can(PERMISSIONS.CLIENT_CREATE) ? (
            <Button
              variant="contained"
              startIcon={<Plus size={16} strokeWidth={2} />}
              onClick={() => setFormClient(null)}
            >
              Add client
            </Button>
          ) : null
        }
      />

      <Card>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ p: 2, alignItems: { md: 'center' } }}>
          <Stack
            direction="row"
            sx={{ p: 0.375, border: `1px solid ${colors.border}`, borderRadius: 999, bgcolor: colors.page, flexShrink: 0 }}
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
                    height: 30,
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
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Icon size={14} strokeWidth={2} aria-hidden="true" />
                  {item.label}
                </Box>
              )
            })}
          </Stack>

          {view === 'list' ? (
            <>
              <SearchField
                value={search}
                onChange={(value) => {
                  setSearch(value)
                  setPage(0)
                }}
                label="Search clients"
                placeholder="Search name, company, contact…"
              />
              <TextField
                select
                size="small"
                label="Status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value)
                  setPage(0)
                }}
                sx={{ minWidth: { md: 170 } }}
              >
                <MenuItem value="">All statuses</MenuItem>
                {STATUSES.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </>
          ) : (
            <TextField
              select
              size="small"
              label="Client"
              value={coverageClientId}
              onChange={(event) => setCoverageClientId(event.target.value)}
              helperText={coverageClientId ? 'Showing only who handles this client.' : 'Pick one to see who handles it.'}
              sx={{ minWidth: { md: 240 } }}
            >
              <MenuItem value="">All clients</MenuItem>
              {(coverage.data ?? []).map((client) => (
                <MenuItem key={client.id} value={client.id}>
                  {client.name}
                  {client.company ? ` · ${client.company}` : ''}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Stack>
        <Divider />

        {view === 'coverage' ? (
          <ClientCoverage
            clients={coverage.data ?? []}
            loading={coverage.loading && !coverage.data}
            error={coverage.error}
            onRetry={coverage.reload}
            onPickClient={findInList}
            canAssign={can(PERMISSIONS.CLIENT_UPDATE)}
            canSeeTickets={can(PERMISSIONS.TICKET_VIEW)}
            focusClientId={coverageClientId}
            onClearFocus={() => setCoverageClientId('')}
          />
        ) : (
          <QueryStateView error={error} onRetry={reload}>
            <TableContainer>
              <Table sx={{ minWidth: 940 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Client</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Handled by</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Tasks</TableCell>
                    <TableCell align="right">Open</TableCell>
                    <TableCell align="right">Points</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
  
                {loading ? (
                  <TableSkeleton rows={pageSize > 10 ? 10 : pageSize} columns={8} />
                ) : (
                  <TableBody>
                    {data?.items?.map((client) => (
                      <TableRow key={client.id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                            <ToneChip label={client.name} tone={client.tone} size="medium" />
                            <Typography variant="caption">{client.company}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Box>{client.contactName || '—'}</Box>
                          <Typography variant="caption">{client.email}</Typography>
                        </TableCell>
                        <TableCell>
                          <HandledBy
                            client={client}
                            canAssign={can(PERMISSIONS.CLIENT_UPDATE)}
                            onAssign={() => setFormClient(client)}
                          />
                        </TableCell>
                        <TableCell>
                          <ToneChip
                            label={client.status}
                            tone={client.status === 'Active' ? 'green' : client.status === 'On hold' ? 'amber' : 'slate'}
                          />
                        </TableCell>
                        <TableCell align="right">{client.taskCount}</TableCell>
                        <TableCell align="right">{client.openTaskCount}</TableCell>
                        <TableCell align="right">{client.points}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                            {can(PERMISSIONS.CLIENT_UPDATE) ? (
                              <Tooltip title="Edit client">
                                <IconButton
                                  size="small"
                                  aria-label={`Edit ${client.name}`}
                                  onClick={() => setFormClient(client)}
                                >
                                  <Pencil size={16} strokeWidth={1.75} />
                                </IconButton>
                              </Tooltip>
                            ) : null}
                            {can(PERMISSIONS.CLIENT_DELETE) ? (
                              <Tooltip title="Delete client">
                                <IconButton
                                  size="small"
                                  aria-label={`Delete ${client.name}`}
                                  onClick={() => {
                                    setDeleteError('')
                                    setDeleteTarget(client)
                                  }}
                                >
                                  <Trash2 size={16} strokeWidth={1.75} />
                                </IconButton>
                              </Tooltip>
                            ) : null}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                )}
              </Table>
            </TableContainer>
  
            {!loading && data?.items?.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No clients found"
                description="Add a client to start filing tasks against them."
              />
            ) : null}
  
            {data?.total ? (
              <>
                <Divider />
                <TablePagination
                  component="div"
                  count={data.total}
                  page={page}
                  onPageChange={(_, next) => setPage(next)}
                  rowsPerPage={pageSize}
                  onRowsPerPageChange={(event) => {
                    setPageSize(Number(event.target.value))
                    setPage(0)
                  }}
                  rowsPerPageOptions={[10, 25, 50]}
                  labelDisplayedRows={({ from, to, count }) => `${from}–${to} of ${pluralize(count, 'client')}`}
                />
              </>
            ) : null}
          </QueryStateView>
        )}
      </Card>

      {formClient !== undefined ? (
        <ClientFormDialog
          client={formClient}
          workspaceId={activeWorkspaceId}
          onClose={() => setFormClient(undefined)}
          onSaved={refresh}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete client"
        description={`Remove ${deleteTarget?.name ?? ''} from the directory? Clients with tasks cannot be deleted.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      >
        {deleteError ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {deleteError}
          </Alert>
        ) : null}
      </ConfirmDialog>
    </Box>
  )
}
