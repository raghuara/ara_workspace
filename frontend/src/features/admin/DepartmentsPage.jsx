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
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SectionCard } from '@/components/SectionCard'
import { QueryStateView } from '@/components/QueryStateView'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { TableSkeleton } from '@/components/TableSkeleton'
import { ToneChip } from '@/components/ToneChip'
import { departmentService } from '@/api/departmentService'
import { PERMISSIONS } from '@/constants/permissions'
import { useAsync } from '@/hooks/useAsync'
import { usePermissions } from '@/hooks/usePermissions'
import { colors, layout } from '@/theme/tokens'
import { pluralize } from '@/utils/format'

const DepartmentDialog = ({ department, onClose, onSaved }) => {
  const isEditing = Boolean(department)
  const [values, setValues] = useState({
    name: department?.name ?? '',
    description: department?.description ?? '',
    isActive: department?.isActive ?? true,
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
      setErrors({ name: 'Department name is required.' })
      return
    }
    setSaving(true)
    try {
      const payload = { name: values.name.trim(), description: values.description.trim(), isActive: values.isActive }
      if (isEditing) await departmentService.updateDepartment(department.id, payload)
      else await departmentService.createDepartment(payload)
      onSaved()
      onClose()
    } catch (caught) {
      if (caught.details) setErrors(caught.details)
      else setError(caught.message ?? 'The department could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <Box component="form" onSubmit={submit} noValidate>
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600 }}>
          {isEditing ? `Edit ${department.name}` : 'New department'}
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
                    Inactive departments stay on existing employees but cannot be chosen for new ones.
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
            {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create department'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

export const DepartmentsPage = () => {
  const { can } = usePermissions()
  const canManage = can(PERMISSIONS.EMPLOYEE_UPDATE)

  const { data, loading, error, reload } = useAsync(departmentService.listDepartments, [])

  const [dialog, setDialog] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  const confirmDelete = async () => {
    setDeleteError('')
    setDeleting(true)
    try {
      await departmentService.deleteDepartment(deleteTarget.id)
      setDeleteTarget(null)
      reload()
    } catch (caught) {
      setDeleteError(caught.message ?? 'The department could not be deleted.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Box sx={{ maxWidth: layout.contentMaxWidth, mx: 'auto', px: { xs: 2, md: 3, lg: 4 }, py: { xs: 3, md: 4 } }}>
      <PageHeader
        title="Departments"
        description="The departments employees are grouped into. Used on employee profiles and filters."
        breadcrumbs={[{ label: 'Administration' }, { label: 'Departments' }]}
        actions={
          canManage ? (
            <Button
              variant="contained"
              startIcon={<Plus size={16} strokeWidth={2} aria-hidden="true" />}
              onClick={() => setDialog({ department: null })}
            >
              New department
            </Button>
          ) : null
        }
      />

      <SectionCard padded={false}>
        <QueryStateView error={error} onRetry={reload}>
          <TableContainer>
            <Table sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Department</TableCell>
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
                  {data?.map((department) => (
                    <TableRow key={department.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                          <Building2 size={17} strokeWidth={1.75} color={colors.textSecondary} aria-hidden="true" />
                          <Typography variant="body2" fontWeight={600}>
                            {department.name}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color={department.description ? 'text.primary' : 'text.secondary'}>
                          {department.description || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>{pluralize(department.employeeCount, 'employee')}</TableCell>
                      <TableCell>
                        <ToneChip
                          label={department.isActive ? 'Active' : 'Inactive'}
                          tone={department.isActive ? 'green' : 'gray'}
                        />
                      </TableCell>
                      {canManage ? (
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.25} sx={{ justifyContent: 'flex-end' }}>
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                aria-label={`Edit ${department.name}`}
                                onClick={() => setDialog({ department })}
                              >
                                <Pencil size={16} strokeWidth={1.75} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                aria-label={`Delete ${department.name}`}
                                onClick={() => {
                                  setDeleteError('')
                                  setDeleteTarget(department)
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
            <EmptyState icon={Building2} title="No departments" description="Create the first department to start grouping employees." />
          ) : null}
        </QueryStateView>
      </SectionCard>

      {dialog ? (
        <DepartmentDialog department={dialog.department} onClose={() => setDialog(null)} onSaved={reload} />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete department?"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" will be removed. Departments with employees cannot be deleted — mark them inactive instead.`
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
