import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { accountService } from '@/api/accountService'
import { useSession } from '@/hooks/useSession'

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

const PasswordForm = ({ forced, onClose }) => {
  const { refreshSession } = useSession()
  const [values, setValues] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)

  const setField = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    const next = {}
    if (!forced && !values.currentPassword) next.currentPassword = 'Enter your current password.'
    if (!PASSWORD_PATTERN.test(values.newPassword)) {
      next.newPassword = 'At least 8 characters, with a letter and a number.'
    } else if (!forced && values.newPassword === values.currentPassword) {
      next.newPassword = 'Choose a different password from the current one.'
    }
    if (values.confirmPassword !== values.newPassword) next.confirmPassword = 'Passwords do not match.'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSaving(true)
    try {
      await accountService.changePassword({
        currentPassword: forced ? '' : values.currentPassword,
        newPassword: values.newPassword,
      })
      await refreshSession()
      onClose()
    } catch (caught) {
      if (caught.details) setErrors(caught.details)
      else setError(caught.message ?? 'The password could not be changed.')
    } finally {
      setSaving(false)
    }
  }

  const fieldProps = (field, label, options = {}) => ({
    label,
    value: values[field],
    onChange: setField(field),
    error: Boolean(errors[field]),
    helperText: errors[field] ?? options.helperText ?? ' ',
    type: show ? 'text' : 'password',
    size: 'small',
    fullWidth: true,
    required: true,
    autoComplete: field === 'currentPassword' ? 'current-password' : 'new-password',
  })

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
        <KeyRound size={18} strokeWidth={1.75} aria-hidden="true" />
        {forced ? 'Set a new password' : 'Change password'}
      </DialogTitle>
      <DialogContent dividers>
        {forced ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            You signed in with a temporary password. Choose your own password to continue.
          </Alert>
        ) : null}
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}
        <Stack spacing={1} sx={{ pt: 0.5 }}>
          {forced ? null : <TextField {...fieldProps('currentPassword', 'Current password')} autoFocus />}
          <TextField
            {...fieldProps('newPassword', 'New password', { helperText: 'At least 8 characters, with a letter and a number.' })}
            autoFocus={forced}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShow((current) => !current)} aria-label={show ? 'Hide passwords' : 'Show passwords'}>
                      {show ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField {...fieldProps('confirmPassword', 'Confirm new password')} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        {forced ? (
          <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto' }}>
            Required before you can continue.
          </Typography>
        ) : (
          <Button onClick={onClose} variant="outlined" disabled={saving}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="contained" disabled={saving}>
          {saving ? 'Saving…' : 'Save password'}
        </Button>
      </DialogActions>
    </Box>
  )
}

export const ChangePasswordDialog = ({ open, forced = false, onClose }) => (
  <Dialog open={open} onClose={forced ? undefined : onClose} maxWidth="xs" fullWidth disableEscapeKeyDown={forced}>
    <PasswordForm forced={forced} onClose={onClose} />
  </Dialog>
)
