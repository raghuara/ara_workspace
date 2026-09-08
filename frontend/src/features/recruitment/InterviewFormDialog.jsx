import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material'
import { employeeService } from '@/api/employeeService'
import { recruitmentService } from '@/api/recruitmentService'
import { isForbidden } from '@/api/httpClient'
import { DEPARTMENTS, INTERVIEW_STATUS, INTERVIEW_TYPES } from '@/constants/domain'
import { useAsync } from '@/hooks/useAsync'
import { useSubmit } from '@/hooks/useSubmit'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const EMPTY_FORM = {
  candidateName: '',
  candidateEmail: '',
  position: '',
  department: '',
  interviewerId: '',
  date: '',
  time: '',
  durationMinutes: 60,
  type: INTERVIEW_TYPES[1],
  status: INTERVIEW_STATUS.SCHEDULED,
  notes: '',
}

const validate = (values) => {
  const errors = {}
  if (!values.candidateName.trim()) errors.candidateName = 'Candidate name is required.'
  if (!values.candidateEmail.trim()) {
    errors.candidateEmail = 'Candidate email is required.'
  } else if (!EMAIL_PATTERN.test(values.candidateEmail.trim())) {
    errors.candidateEmail = 'Enter a valid email address.'
  }
  if (!values.position.trim()) errors.position = 'Position is required.'
  if (!values.department) errors.department = 'Department is required.'
  if (!values.interviewerId) errors.interviewerId = 'An interviewer must be assigned.'
  if (!values.date) errors.date = 'Date is required.'
  if (!values.time) errors.time = 'Time is required.'
  if (!values.durationMinutes || values.durationMinutes < 15) {
    errors.durationMinutes = 'Duration must be at least 15 minutes.'
  }
  return errors
}

export const InterviewFormDialog = ({ open, interview, onClose, onSaved }) => {
  const isEditing = Boolean(interview)
  const [values, setValues] = useState(() => (interview ? { ...EMPTY_FORM, ...interview } : EMPTY_FORM))
  const [errors, setErrors] = useState({})

  const { data: employeeOptions } = useAsync(employeeService.getEmployeeOptions, [], {
    enabled: open,
  })

  const { submit, submitting, error } = useSubmit((payload) =>
    isEditing
      ? recruitmentService.updateInterview(interview.id, payload)
      : recruitmentService.createInterview(payload),
  )

  const setField = (field) => (event) => {
    const value = field === 'durationMinutes' ? Number(event.target.value) : event.target.value
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const validationErrors = validate(values)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    const saved = await submit(values)
    if (saved) {
      onSaved()
      onClose()
    }
  }

  const fieldProps = (field, label, options = {}) => ({
    label,
    value: values[field] ?? '',
    onChange: setField(field),
    error: Boolean(errors[field]),
    helperText: errors[field] ?? ' ',
    size: 'small',
    fullWidth: true,
    required: options.required ?? true,
    ...options.rest,
  })

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="md" fullWidth>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogTitle sx={{ fontSize: '1.125rem', fontWeight: 600 }}>
          {isEditing ? 'Edit interview' : 'Schedule interview'}
        </DialogTitle>
        <DialogContent dividers>
          {error ? (
            <Alert severity="error" sx={{ mb: 2.5 }}>
              {isForbidden(error)
                ? 'You do not have permission to change the interview schedule.'
                : (error.message ?? 'The interview could not be saved.')}
            </Alert>
          ) : null}

          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              pt: 1,
            }}
          >
            <TextField {...fieldProps('candidateName', 'Candidate name')} />
            <TextField {...fieldProps('candidateEmail', 'Candidate email', { rest: { type: 'email' } })} />
            <TextField {...fieldProps('position', 'Position')} />
            <TextField {...fieldProps('department', 'Department', { rest: { select: true } })}>
              {DEPARTMENTS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
            <TextField {...fieldProps('interviewerId', 'Interviewer', { rest: { select: true } })}>
              {(employeeOptions ?? []).map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.fullName} — {option.designation}
                </MenuItem>
              ))}
            </TextField>
            <TextField {...fieldProps('type', 'Interview type', { rest: { select: true } })}>
              {INTERVIEW_TYPES.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              {...fieldProps('date', 'Date', {
                rest: { type: 'date', slotProps: { inputLabel: { shrink: true } } },
              })}
            />
            <TextField
              {...fieldProps('time', 'Start time', {
                rest: { type: 'time', slotProps: { inputLabel: { shrink: true } } },
              })}
            />
            <TextField
              {...fieldProps('durationMinutes', 'Duration (minutes)', {
                rest: { type: 'number', slotProps: { htmlInput: { min: 15, step: 15 } } },
              })}
            />
            <TextField {...fieldProps('status', 'Status', { rest: { select: true } })}>
              {Object.values(INTERVIEW_STATUS).map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <TextField
            label="Notes"
            value={values.notes ?? ''}
            onChange={setField('notes')}
            size="small"
            fullWidth
            multiline
            minRows={3}
            placeholder="Context for the interviewer, scheduling constraints, and so on"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} variant="outlined" disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Schedule interview'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
