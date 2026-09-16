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
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SearchField } from '@/components/SearchField'
import { EmptyState } from '@/components/EmptyState'
import { QueryStateView } from '@/components/QueryStateView'
import { TableSkeleton } from '@/components/TableSkeleton'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ToneChip } from '@/components/ToneChip'
import { clientService } from '@/api/clientService'
import { isForbidden } from '@/api/httpClient'
import { PERMISSIONS } from '@/constants/permissions'
import { TONE_KEYS } from '@/constants/workspaceDomain'
import { useAsync } from '@/hooks/useAsync'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePermissions } from '@/hooks/usePermissions'
import { useSubmit } from '@/hooks/useSubmit'
import { useWorkspace } from '@/hooks/useWorkspace'
import { layout } from '@/theme/tokens'
import { pluralize } from '@/utils/format'

const STATUSES = ['Active', 'On hold', 'Prospect', 'Closed']

const ClientFormDialog = ({ client, workspaceId, onClose, onSaved }) => {
  const isEditing = Boolean(client)
  const [values, setValues] = useState(() => ({
    name: client?.name ?? '',
    company: client?.company ?? '',
    contactName: client?.contactName ?? '',
    email: client?.email ?? '',
    phone: client?.phone ?? '',
    status: client?.status ?? 'Active',
    tone: client?.tone ?? 'blue',
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
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600 }}>
          {isEditing ? 'Edit client' : 'Add client'}
        </DialogTitle>
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

          <Typography variant="caption" component="p" sx={{ mb: 0.75 }}>
            Colour — used on task cards so this client is recognisable at a glance
          </Typography>
          <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {TONE_KEYS.map((tone) => (
              <Box
                key={tone}
                component="button"
                type="button"
                aria-label={`Colour ${tone}`}
                aria-pressed={values.tone === tone}
                onClick={() => setValues((current) => ({ ...current, tone }))}
                sx={{ border: 0, background: 'none', p: 0, cursor: 'pointer' }}
              >
                <ToneChip
                  label={values.name || tone}
                  tone={tone}
                  sx={values.tone === tone ? { outline: '2px solid #2563EB', outlineOffset: 1 } : undefined}
                />
              </Box>
            ))}
          </Stack>
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

  const refresh = () => {
    reload()
    refreshStructure()
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
            <Button variant="contained" startIcon={<Plus size={16} strokeWidth={2} />} onClick={() => setFormClient(null)}>
              Add client
            </Button>
          ) : null
        }
      />

      <Card>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ p: 2 }}>
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
        </Stack>
        <Divider />

        <QueryStateView error={error} onRetry={reload}>
          <TableContainer>
            <Table sx={{ minWidth: 940 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Client</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Tasks</TableCell>
                  <TableCell align="right">Open</TableCell>
                  <TableCell align="right">Points</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>

              {loading ? (
                <TableSkeleton rows={pageSize > 10 ? 10 : pageSize} columns={7} />
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
                              <IconButton size="small" aria-label={`Edit ${client.name}`} onClick={() => setFormClient(client)}>
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
            <EmptyState icon={Building2} title="No clients found" description="Add a client to start filing tasks against them." />
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
