import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material'
import { CircleCheck } from 'lucide-react'
import { departmentService, designationService } from '@/api/catalogService'
import { employeeService } from '@/api/employeeService'
import { isForbidden } from '@/api/httpClient'
import { EMPLOYMENT_STATUS, EMPLOYMENT_TYPES, WORK_LOCATIONS } from '@/constants/domain'
import { useAsync } from '@/hooks/useAsync'
import { useSubmit } from '@/hooks/useSubmit'
import { useWorkspace } from '@/hooks/useWorkspace'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const STATUS_OPTIONS = Object.values(EMPLOYMENT_STATUS)

const today = () => new Date().toISOString().slice(0, 10)

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  department: '',
  designation: '',
  joiningDate: today(),
  status: EMPLOYMENT_STATUS.PROBATION,
  employmentType: EMPLOYMENT_TYPES[0],
  workLocation: WORK_LOCATIONS[0],
  reportingManagerId: '',
}

const toForm = (employee) =>
  employee
    ? {
        firstName: employee.firstName ?? '',
        lastName: employee.lastName ?? '',
        email: employee.email ?? '',
        phone: employee.phone ?? '',
        department: employee.department ?? '',
        designation: employee.designation ?? '',
        joiningDate: employee.joiningDate ?? today(),
        status: employee.status ?? EMPLOYMENT_STATUS.ACTIVE,
        employmentType: employee.employmentType ?? EMPLOYMENT_TYPES[0],
        workLocation: employee.workLocation ?? WORK_LOCATIONS[0],
        reportingManagerId: employee.reportingManagerId ?? '',
      }
    : EMPTY_FORM

const validate = (values) => {
  const errors = {}
  if (!values.firstName.trim()) errors.firstName = 'First name is required.'
  if (!values.lastName.trim()) errors.lastName = 'Last name is required.'
  if (!values.email.trim()) {
    errors.email = 'Work email is required.'
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }
  if (!values.department) errors.department = 'Department is required.'
  if (!values.designation.trim()) errors.designation = 'Designation is required.'
  if (!values.joiningDate) errors.joiningDate = 'Joining date is required.'
  return errors
}

const EmployeeForm = ({ employee, onClose, onSaved }) => {
  const isEditing = Boolean(employee)
  const [values, setValues] = useState(() => toForm(employee))
  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState(null)

  useEffect(() => {
    if (!saved) return undefined
    const timer = setTimeout(() => onSaved(saved), 900)
    return () => clearTimeout(timer)
  }, [saved, onSaved])

  const { activeWorkspaceId, activeWorkspace } = useWorkspace()
  const workspaceId = employee?.workspaceId ?? activeWorkspaceId
  const { data: managerOptions } = useAsync(employeeService.getEmployeeOptions, [workspaceId], {
    enabled: Boolean(workspaceId),
  })
  const { data: departments } = useAsync(departmentService.list, [{ workspaceId, activeOnly: true }], {
    enabled: Boolean(workspaceId),
  })
  const { data: designations } = useAsync(designationService.list, [{ workspaceId, activeOnly: true }], {
    enabled: Boolean(workspaceId),
  })

  const { submit, submitting, error, reset } = useSubmit((payload) =>
    isEditing ? employeeService.updateEmployee(employee.id, payload) : employeeService.createEmployee(payload),
  )

  const setField = (field) => (event) => {
    const { value } = event.target
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const handleClose = () => {
    if (submitting) return
    reset()
    onClose()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const validationErrors = validate(values)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    const payload = {
      ...values,
      workspaceId,
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim() || undefined,
      designation: values.designation.trim(),
      reportingManagerId: values.reportingManagerId || undefined,
    }

    const result = await submit(payload)
    if (result) {
      setErrors({})
      if (isEditing) onSaved(result)
      else setSaved(result)
    }
  }

  const serverErrors = error?.details ?? {}

  const fieldProps = (field, label, options = {}) => ({
    label,
    value: values[field] ?? '',
    onChange: setField(field),
    error: Boolean(errors[field] ?? serverErrors[field]),
    helperText: errors[field] ?? serverErrors[field] ?? ' ',
    size: 'small',
    fullWidth: true,
    required: options.required ?? true,
    ...options.rest,
  })

  const managers = (managerOptions ?? []).filter((option) => option.id !== employee?.id)

  if (saved) {
    return (
      <Box sx={{ px: 3, py: 5, textAlign: 'center' }}>
        <CircleCheck size={44} strokeWidth={1.5} color="#15803D" aria-hidden="true" />
        <Typography variant="h3" sx={{ mt: 1.5 }}>
          {saved.fullName} has been onboarded
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
          {saved.employeeId} · {saved.designation} · {saved.department}
        </Typography>
        <LinearProgress sx={{ maxWidth: 280, mx: 'auto', borderRadius: 999 }} />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Opening profile…
        </Typography>
      </Box>
    )
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600 }}>
        {isEditing
          ? `Edit ${employee.fullName}`
          : `Onboard employee${activeWorkspace ? ` · ${activeWorkspace.name}` : ''}`}
      </DialogTitle>
      <DialogContent dividers>
        {error && !error.details ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {isForbidden(error)
              ? 'You do not have permission to change employee records.'
              : (error.message ?? 'The employee could not be saved.')}
          </Alert>
        ) : null}

        <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          Identity
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          }}
        >
          <TextField
            {...fieldProps('firstName', 'First name', {
              rest: { autoFocus: !isEditing },
            })}
          />
          <TextField {...fieldProps('lastName', 'Last name')} />
          <TextField {...fieldProps('email', 'Work email', { rest: { type: 'email' } })} />
          <TextField
            {...fieldProps('phone', 'Contact number', {
              required: false,
              rest: { type: 'tel' },
            })}
          />
        </Box>

        <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mt: 1.5, mb: 0.5 }}>
          Role
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          }}
        >
          <TextField
            {...fieldProps('department', 'Department', {
              rest: { select: true },
            })}
          >
            {(departments ?? []).map((option) => (
              <MenuItem key={option.id} value={option.name}>
                {option.name}
              </MenuItem>
            ))}
            {isEditing &&
            values.department &&
            !(departments ?? []).some((option) => option.name === values.department) ? (
              <MenuItem value={values.department}>{values.department} (inactive)</MenuItem>
            ) : null}
          </TextField>
          <TextField {...fieldProps('designation', 'Designation', { rest: { select: true } })}>
            {(designations ?? []).map((option) => (
              <MenuItem key={option.id} value={option.name}>
                {option.name}
              </MenuItem>
            ))}
            {isEditing &&
            values.designation &&
            !(designations ?? []).some((option) => option.name === values.designation) ? (
              <MenuItem value={values.designation}>{values.designation} (inactive)</MenuItem>
            ) : null}
          </TextField>
          <TextField
            {...fieldProps('reportingManagerId', 'Reporting manager', {
              required: false,
              rest: { select: true },
            })}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {managers.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.fullName} — {option.designation}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            {...fieldProps('joiningDate', 'Joining date', {
              rest: {
                type: 'date',
                slotProps: { inputLabel: { shrink: true } },
              },
            })}
          />
        </Box>

        <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mt: 1.5, mb: 0.5 }}>
          Employment
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          }}
        >
          <TextField {...fieldProps('status', 'Status', { rest: { select: true } })}>
            {STATUS_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            {...fieldProps('employmentType', 'Employment type', {
              rest: { select: true },
            })}
          >
            {EMPLOYMENT_TYPES.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            {...fieldProps('workLocation', 'Work location', {
              rest: { select: true },
            })}
          >
            {WORK_LOCATIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={submitting} variant="outlined">
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={submitting}>
          {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Onboard employee'}
        </Button>
      </DialogActions>
    </Box>
  )
}

export const EmployeeFormDialog = ({ open, employee = null, onClose, onSaved }) => (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
    <EmployeeForm employee={employee} onClose={onClose} onSaved={onSaved} />
  </Dialog>
)
