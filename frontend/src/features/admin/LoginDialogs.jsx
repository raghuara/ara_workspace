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
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { Copy } from 'lucide-react'
import { accountService } from '@/api/accountService'
import { useAsync } from '@/hooks/useAsync'

export const TemporaryPasswordDialog = ({ result, onClose }) => {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.temporaryPassword)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600 }}>Temporary password</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          Share this with <strong>{result.account.fullName}</strong>. It is shown only once — they will be asked to set
          their own password at first sign-in.
        </Typography>
        <Stack spacing={1}>
          <TextField
            label="Login email"
            value={result.account.email}
            size="small"
            fullWidth
            slotProps={{ input: { readOnly: true } }}
          />
          <TextField
            label="Temporary password"
            value={result.temporaryPassword}
            size="small"
            fullWidth
            slotProps={{
              input: {
                readOnly: true,
                sx: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', letterSpacing: '0.04em' },
                endAdornment: (
                  <Tooltip title={copied ? 'Copied' : 'Copy'}>
                    <IconButton size="small" onClick={copy} aria-label="Copy temporary password">
                      <Copy size={16} strokeWidth={1.75} />
                    </IconButton>
                  </Tooltip>
                ),
              },
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} variant="contained">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  )
}

const CreateLoginForm = ({ account, userTypes, onClose, onCreated }) => {
  const [userTypeId, setUserTypeId] = useState(
    userTypes.find((type) => type.slug === 'employee')?.id ?? userTypes[0]?.id ?? '',
  )
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const result = await accountService.createAccount({
        employeeId: account.employeeId,
        userTypeId,
        password: password.trim() || undefined,
      })
      onCreated(result)
    } catch (caught) {
      if (caught.details) setErrors(caught.details)
      else setError(caught.message ?? 'The login could not be created.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600 }}>Create login for {account.fullName}</DialogTitle>
      <DialogContent dividers>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}
        {userTypes.length === 0 ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            There is no user type you are allowed to grant. Ask a Master Admin to review User Types.
          </Alert>
        ) : null}
        <Stack spacing={1.5} sx={{ pt: 0.5 }}>
          <TextField
            label="Login email"
            value={account.email}
            size="small"
            fullWidth
            slotProps={{ input: { readOnly: true } }}
            helperText="Their work email."
          />
          <TextField
            select
            label="User type"
            value={userTypeId}
            onChange={(event) => setUserTypeId(event.target.value)}
            size="small"
            fullWidth
            required
            error={Boolean(errors.userTypeId)}
            helperText={errors.userTypeId ?? 'Decides what they can do. Where they can do it is set per workspace.'}
          >
            {userTypes.map((type) => (
              <MenuItem key={type.id} value={type.id}>
                {type.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Temporary password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setErrors((current) => ({ ...current, password: undefined }))
            }}
            size="small"
            fullWidth
            error={Boolean(errors.password)}
            helperText={errors.password ?? 'Leave blank to generate one automatically.'}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} variant="outlined" disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={saving || userTypes.length === 0}>
          {saving ? 'Creating…' : 'Create login'}
        </Button>
      </DialogActions>
    </Box>
  )
}

export const CreateLoginDialog = ({ account, userTypes = null, onClose, onCreated }) => {
  const loaded = useAsync(accountService.listUserTypes, [], { enabled: userTypes === null })
  const options = userTypes ?? loaded.data

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      {options ? (
        <CreateLoginForm account={account} userTypes={options} onClose={onClose} onCreated={onCreated} />
      ) : (
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {loaded.error ? (loaded.error.message ?? 'User types could not be loaded.') : 'Loading user types…'}
          </Typography>
        </DialogContent>
      )}
    </Dialog>
  )
}
