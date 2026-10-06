import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SectionCard } from '@/components/SectionCard'
import { QueryStateView } from '@/components/QueryStateView'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { TableSkeleton } from '@/components/TableSkeleton'
import { ToneChip } from '@/components/ToneChip'
import { PERMISSIONS } from '@/constants/permissions'
import { useAsync } from '@/hooks/useAsync'
import { usePermissions } from '@/hooks/usePermissions'
import { useWorkspace } from '@/hooks/useWorkspace'
import { colors, layout } from '@/theme/tokens'
import { pluralize } from '@/utils/format'

const CatalogDialog = ({ config, item, workspaceId, onClose, onSaved }) => {
  const isEditing = Boolean(item)
  const [values, setValues] = useState({
    name: item?.name ?? '',
    description: item?.description ?? '',
    isActive: item?.isActive ?? true,
  })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const setField = (field) => (event) => {
    const value = field === 'isActive' ? event.target.checked : event.target.value
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!values.name.trim()) {
      setErrors({ name: `${config.singular} name is required.` })
      return
    }
    setSaving(true)
    try {
      const payload = { name: values.name.trim(), description: values.description.trim(), isActive: values.isActive }
      if (isEditing) await config.service.update(item.id, payload)
      else await config.service.create({ ...payload, workspaceId })
      onSaved()
      onClose()
    } catch (caught) {
      if (caught.details) setErrors(caught.details)
      else setError(caught.message ?? `The ${config.singular.toLowerCase()} could not be saved.`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <Box component="form" onSubmit={submit} noValidate>
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600 }}>
          {isEditing ? `Edit ${item.name}` : `New ${config.singular.toLowerCase()}`}
        </DialogTitle>
        <DialogContent dividers>
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : null}
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <TextField
              label="Name"
              value={values.name}
              onChange={setField('name')}
              size="small"
              fullWidth
              required
              autoFocus={!isEditing}
              error={Boolean(errors.name)}
              helperText={errors.name ?? ' '}
            />
            <TextField
              label="Description"
              value={values.description}
              onChange={setField('description')}
              size="small"
              fullWidth
              multiline
              minRows={2}
              helperText=" "
            />
            <FormControlLabel
              control={<Switch checked={values.isActive} onChange={setField('isActive')} />}
              label={
                <Box>
                  <Typography variant="body2">Active</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Inactive {config.plural.toLowerCase()} stay on existing employees but cannot be chosen for new ones.
                  </Typography>
                </Box>
              }
              sx={{ alignItems: 'flex-start', ml: 0 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={onClose} variant="outlined" disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Saving…' : isEditing ? 'Save changes' : `Create ${config.singular.toLowerCase()}`}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

export const CatalogPage = ({ config }) => {
  const { can } = usePermissions()
  const canManage = can(PERMISSIONS.EMPLOYEE_UPDATE)
  const Icon = config.icon
  const { activeWorkspaceId, activeWorkspace } = useWorkspace()

  const { data, loading, error, reload } = useAsync(config.service.list, [{ workspaceId: activeWorkspaceId }], {
    enabled: Boolean(activeWorkspaceId),
  })

  const [dialog, setDialog] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  const confirmDelete = async () => {
    setDeleteError('')
    setDeleting(true)
    try {
      await config.service.remove(deleteTarget.id)
      setDeleteTarget(null)
      reload()
    } catch (caught) {
      setDeleteError(caught.message ?? `The ${config.singular.toLowerCase()} could not be deleted.`)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Box sx={{ maxWidth: layout.contentMaxWidth, mx: 'auto', px: { xs: 2, md: 3, lg: 4 }, py: { xs: 3, md: 4 } }}>
      <PageHeader
        title={config.plural}
        description={
          activeWorkspace ? `${config.description} These belong to ${activeWorkspace.name}.` : config.description
        }
        breadcrumbs={[{ label: 'Administration' }, { label: 'Setup' }, { label: config.plural }]}
        actions={
          canManage ? (
            <Tooltip title={activeWorkspaceId ? '' : 'Create a workspace first'}>
              <span>
                <Button
                  variant="contained"
                  disabled={!activeWorkspaceId}
                  startIcon={<Plus size={16} strokeWidth={2} aria-hidden="true" />}
                  onClick={() => setDialog({ item: null })}
                >
                  New {config.singular.toLowerCase()}
                </Button>
              </span>
            </Tooltip>
          ) : null
        }
      />

      <SectionCard padded={false}>
        <QueryStateView error={error} onRetry={reload}>
          <TableContainer>
            <Table sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow>
                  <TableCell>{config.singular}</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Employees</TableCell>
                  <TableCell>Status</TableCell>
                  {canManage ? <TableCell align="right">Actions</TableCell> : null}
                </TableRow>
              </TableHead>
              {loading ? (
                <TableSkeleton rows={5} columns={canManage ? 5 : 4} />
              ) : (
                <TableBody>
                  {data?.map((item) => (
                    <TableRow key={item.id} hover sx={{ opacity: item.isActive ? 1 : 0.65 }}>
                      <TableCell>
                        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                          <Icon size={17} strokeWidth={1.75} color={colors.textSecondary} aria-hidden="true" />
                          <Typography variant="body2" fontWeight={600}>
                            {item.name}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color={item.description ? 'text.primary' : 'text.secondary'}>
                          {item.description || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>{pluralize(item.employeeCount, 'employee')}</TableCell>
                      <TableCell>
                        <ToneChip
                          label={item.isActive ? 'Active' : 'Inactive'}
                          tone={item.isActive ? 'green' : 'gray'}
                        />
                      </TableCell>
                      {canManage ? (
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.25} sx={{ justifyContent: 'flex-end' }}>
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                aria-label={`Edit ${item.name}`}
                                onClick={() => setDialog({ item })}
                              >
                                <Pencil size={16} strokeWidth={1.75} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                aria-label={`Delete ${item.name}`}
                                onClick={() => {
                                  setDeleteError('')
                                  setDeleteTarget(item)
                                }}
                                sx={{ color: colors.danger }}
                              >
                                <Trash2 size={16} strokeWidth={1.75} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              )}
            </Table>
          </TableContainer>
          {!loading && data?.length === 0 ? (
            <EmptyState
              icon={Icon}
              title={`No ${config.plural.toLowerCase()}`}
              description={`Create the first ${config.singular.toLowerCase()} to get started.`}
            />
          ) : null}
        </QueryStateView>
      </SectionCard>

      {dialog ? (
        <CatalogDialog
          config={config}
          item={dialog.item}
          workspaceId={activeWorkspaceId}
          onClose={() => setDialog(null)}
          onSaved={reload}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${config.singular.toLowerCase()}?`}
        description={
          deleteTarget
            ? `"${deleteTarget.name}" will be removed. ${config.plural} with employees cannot be deleted — mark them inactive instead.`
            : ''
        }
        confirmLabel="Delete"
        confirming={deleting}
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
