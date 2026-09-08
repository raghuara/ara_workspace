import { useMemo, useState } from 'react'
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { Pencil, Save, X } from 'lucide-react'
import { SectionCard } from '@/components/SectionCard'
import { DefinitionList } from '@/components/DefinitionList'
import { employeeService } from '@/api/employeeService'
import { isForbidden } from '@/api/httpClient'
import { PERMISSIONS } from '@/constants/permissions'
import { usePermissions } from '@/hooks/usePermissions'
import { useSubmit } from '@/hooks/useSubmit'
import { formatDate } from '@/utils/date'
import { validatePersonalInformation } from '../personalInformationValidation'

const GENDER_OPTIONS = ['Female', 'Male', 'Prefer not to say']
const MARITAL_OPTIONS = ['Single', 'Married', 'Divorced', 'Widowed']
const RELATIONSHIP_OPTIONS = ['Spouse', 'Parent', 'Sibling', 'Child', 'Guardian', 'Friend']

export const PersonalInformationTab = ({ employee, onSaved }) => {
  const { can } = usePermissions()
  const canEdit = can(PERMISSIONS.EMPLOYEE_UPDATE)

  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState(employee.personalInformation)
  const [errors, setErrors] = useState({})

  const { submit, submitting, error, succeeded, reset } = useSubmit((payload) =>
    employeeService.updatePersonalInformation(employee.id, payload),
  )

  const readOnlyItems = useMemo(() => {
    const info = employee.personalInformation
    return [
      { label: 'Date of birth', value: formatDate(info.dateOfBirth) },
      { label: 'Gender', value: info.gender },
      { label: 'Marital status', value: info.maritalStatus },
      { label: 'Nationality', value: info.nationality },
      { label: 'National ID', value: info.nationalId },
      { label: 'Personal email', value: info.personalEmail },
      { label: 'Address line 1', value: info.addressLine1 },
      { label: 'Address line 2', value: info.addressLine2 },
      { label: 'City', value: info.city },
      { label: 'Postal code', value: info.postalCode },
      { label: 'Country', value: info.country },
      { label: 'Emergency contact', value: info.emergencyContact.name },
      { label: 'Relationship', value: info.emergencyContact.relationship },
      { label: 'Emergency number', value: info.emergencyContact.phone },
    ]
  }, [employee.personalInformation])

  const setField = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const setEmergencyField = (field) => (event) => {
    const { value } = event.target
    setValues((current) => ({
      ...current,
      emergencyContact: { ...current.emergencyContact, [field]: value },
    }))
    setErrors((current) => ({ ...current, [`emergencyContact.${field}`]: undefined }))
  }

  const startEditing = () => {
    reset()
    setErrors({})
    setValues(employee.personalInformation)
    setEditing(true)
  }

  const cancelEditing = () => {
    setValues(employee.personalInformation)
    setErrors({})
    reset()
    setEditing(false)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const validationErrors = validatePersonalInformation(values)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    const updated = await submit(values)
    if (updated) {
      onSaved?.(updated)
      setEditing(false)
    }
  }

  const fieldProps = (field, label, options = {}) => ({
    label,
    value: values[field] ?? '',
    onChange: setField(field),
    error: Boolean(errors[field]),
    helperText: errors[field] ?? options.helperText ?? ' ',
    size: 'small',
    fullWidth: true,
    required: options.required ?? true,
    ...options.rest,
  })

  const emergencyProps = (field, label) => ({
    label,
    value: values.emergencyContact?.[field] ?? '',
    onChange: setEmergencyField(field),
    error: Boolean(errors[`emergencyContact.${field}`]),
    helperText: errors[`emergencyContact.${field}`] ?? ' ',
    size: 'small',
    fullWidth: true,
    required: true,
  })

  if (!editing) {
    return (
      <SectionCard
        title="Personal information"
        description="Private details held for this employee"
        action={
          canEdit ? (
            <Button
              size="small"
              variant="outlined"
              onClick={startEditing}
              startIcon={<Pencil size={15} strokeWidth={1.75} />}
            >
              Edit
            </Button>
          ) : null
        }
      >
        {succeeded ? (
          <Alert severity="success" sx={{ mb: 2.5 }} onClose={reset}>
            Personal information updated.
          </Alert>
        ) : null}
        <DefinitionList items={readOnlyItems} />
      </SectionCard>
    )
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <SectionCard
        title="Edit personal information"
        description="All fields marked with an asterisk are required"
        action={
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              onClick={cancelEditing}
              disabled={submitting}
              startIcon={<X size={15} strokeWidth={1.75} />}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="small"
              variant="contained"
              disabled={submitting}
              startIcon={<Save size={15} strokeWidth={1.75} />}
            >
              {submitting ? 'Saving…' : 'Save changes'}
            </Button>
          </Stack>
        }
      >
        {error ? (
          <Alert severity="error" sx={{ mb: 2.5 }}>
            {isForbidden(error)
              ? 'You do not have permission to update this employee.'
              : (error.message ?? 'The changes could not be saved.')}
          </Alert>
        ) : null}

        {Object.keys(errors).length > 0 ? (
          <Alert severity="warning" sx={{ mb: 2.5 }}>
            Please correct the highlighted fields before saving.
          </Alert>
        ) : null}

        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          }}
        >
          <TextField
            {...fieldProps('dateOfBirth', 'Date of birth', {
              rest: { type: 'date', slotProps: { inputLabel: { shrink: true } } },
            })}
          />
          <TextField {...fieldProps('gender', 'Gender', { rest: { select: true } })}>
            {GENDER_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField {...fieldProps('maritalStatus', 'Marital status', { rest: { select: true } })}>
            {MARITAL_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField {...fieldProps('nationality', 'Nationality')} />
          <TextField {...fieldProps('nationalId', 'National ID')} />
          <TextField {...fieldProps('personalEmail', 'Personal email', { rest: { type: 'email' } })} />
        </Box>

        <Typography variant="h4" sx={{ mt: 2, mb: 1.5 }}>
          Address
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          }}
        >
          <TextField {...fieldProps('addressLine1', 'Address line 1')} />
          <TextField {...fieldProps('addressLine2', 'Address line 2', { required: false })} />
          <TextField {...fieldProps('city', 'City')} />
          <TextField {...fieldProps('postalCode', 'Postal code')} />
          <TextField {...fieldProps('country', 'Country')} />
        </Box>

        <Typography variant="h4" sx={{ mt: 2, mb: 1.5 }}>
          Emergency contact
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          }}
        >
          <TextField {...emergencyProps('name', 'Contact name')} />
          <TextField {...emergencyProps('relationship', 'Relationship')} select>
            {RELATIONSHIP_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField {...emergencyProps('phone', 'Contact number')} />
        </Box>
      </SectionCard>
    </Box>
  )
}
