import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link as MuiLink,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Columns3, Eye, EyeOff, ShieldCheck, Users } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ToneChip } from '@/components/ToneChip'
import { UserAvatar } from '@/components/UserAvatar'
import { DEMO_PASSWORD, authService } from '@/api/authService'
import { isUnauthorized } from '@/api/httpClient'
import { ROUTES } from '@/constants/routes'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { useAsync } from '@/hooks/useAsync'
import { useSession } from '@/hooks/useSession'
import { colors } from '@/theme/tokens'
import logoUrl from '@/assets/logo.png'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const HIGHLIGHTS = [
  { icon: Columns3, tone: 'blue', title: 'One board per workspace', body: 'Board, list and table views over the same tasks.' },
  { icon: Users, tone: 'violet', title: 'Groups and teams', body: 'Departments, sub-teams and leads, all in one place.' },
  { icon: ShieldCheck, tone: 'teal', title: 'Roles you control', body: 'Permissions by user type, not by name.' },
]

const USER_TYPE_TONES = { 1: 'violet', 2: 'blue', 3: 'slate', 4: 'teal', 5: 'orange' }

export const LoginPage = () => {
  const { isAuthenticated, login } = useSession()
  const navigate = useNavigate()
  const location = useLocation()

  const [values, setValues] = useState({ email: '', password: '', remember: true })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [resetNote, setResetNote] = useState(false)

  const demoAccounts = useAsync(authService.listDemoAccounts, [])

  // Already signed in — nothing to do here.
  if (isAuthenticated) {
    return <Navigate to={location.state?.from?.pathname ?? ROUTES.dashboard} replace />
  }

  const setField = (field) => (event) => {
    const value = field === 'remember' ? event.target.checked : event.target.value
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setFormError('')
  }

  const validate = () => {
    const next = {}
    if (!values.email.trim()) next.email = 'Enter your email address.'
    else if (!EMAIL_PATTERN.test(values.email.trim())) next.email = 'That does not look like a valid email.'
    if (!values.password) next.password = 'Enter your password.'
    return next
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const validation = validate()
    setErrors(validation)
    if (Object.keys(validation).length > 0) return

    setSubmitting(true)
    setFormError('')
    try {
      await login({ email: values.email.trim(), password: values.password, remember: values.remember })
      navigate(location.state?.from?.pathname ?? ROUTES.dashboard, { replace: true })
    } catch (caught) {
      setFormError(
        isUnauthorized(caught)
          ? 'The email or password is incorrect.'
          : (caught.message ?? 'Sign in failed. Please try again.'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const fillDemo = (account) => {
    setValues((current) => ({ ...current, email: account.email, password: DEMO_PASSWORD }))
    setErrors({})
    setFormError('')
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        '@supports (height: 100dvh)': { minHeight: '100dvh' },
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.05fr) minmax(0, 1fr)' },
        bgcolor: colors.page,
      }}
    >
      {/* Brand panel — hidden on phones, where the form is all that matters */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          px: { md: 6, lg: 8, xxl: 12 },
          py: { md: 5, lg: 6 },
          bgcolor: colors.surface,
          borderRight: `1px solid ${colors.border}`,
        }}
      >
        <Box component="img" src={logoUrl} alt="ARA Workspace" sx={{ height: 34, width: 'auto', alignSelf: 'flex-start' }} />

        <Box sx={{ maxWidth: 480 }}>
          <Typography variant="h1" sx={{ fontSize: { md: '1.75rem', lg: '2rem' }, mb: 1.25 }}>
            Where the day's work lives.
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Track every task across clients, groups and teams — and see who really carried the load.
          </Typography>

          <Stack spacing={1.5}>
            {HIGHLIGHTS.map((item) => {
              const tone = STATUS_TONES[item.tone]
              return (
                <Stack
                  key={item.title}
                  direction="row"
                  spacing={1.5}
                  sx={{
                    alignItems: 'flex-start',
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: tone.soft,
                    border: `1px solid ${tone.border}`,
                  }}
                >
                  <Box sx={{ display: 'inline-flex', color: tone.strong, mt: 0.125, flexShrink: 0 }}>
                    <item.icon size={18} strokeWidth={1.75} aria-hidden="true" />
                  </Box>
                  <Box>
                    <Typography variant="body2" fontWeight={650}>
                      {item.title}
                    </Typography>
                    <Typography variant="caption" component="p" sx={{ color: colors.textPrimary, opacity: 0.72 }}>
                      {item.body}
                    </Typography>
                  </Box>
                </Stack>
              )
            })}
          </Stack>
        </Box>

        <Typography variant="caption">© {new Date().getFullYear()} ARA Workspace</Typography>
      </Box>

      {/* Form panel */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', px: { xs: 2, sm: 4 }, py: { xs: 4, md: 6 } }}>
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          <Box component="img" src={logoUrl} alt="ARA Workspace" sx={{ height: 30, width: 'auto', display: { xs: 'block', md: 'none' }, mb: 3 }} />

          <Typography variant="h2" component="h1" sx={{ mb: 0.5 }}>
            Sign in
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Use your work email to continue.
          </Typography>

          <Box component="form" onSubmit={handleSubmit} noValidate>
            {formError ? (
              <Alert severity="error" sx={{ mb: 2 }} role="alert">
                {formError}
              </Alert>
            ) : null}

            <TextField
              label="Email"
              type="email"
              value={values.email}
              onChange={setField('email')}
              error={Boolean(errors.email)}
              helperText={errors.email ?? ' '}
              size="small"
              fullWidth
              required
              autoFocus
              autoComplete="email"
              slotProps={{ htmlInput: { inputMode: 'email' } }}
            />

            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={values.password}
              onChange={setField('password')}
              error={Boolean(errors.password)}
              helperText={errors.password ?? ' '}
              size="small"
              fullWidth
              required
              autoComplete="current-password"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowPassword((current) => !current)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                        edge="end"
                      >
                        {showPassword ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <FormControlLabel
                control={<Checkbox size="small" checked={values.remember} onChange={setField('remember')} />}
                label={<Typography variant="body2">Keep me signed in</Typography>}
                sx={{ mr: 0 }}
              />
              <MuiLink
                component="button"
                type="button"
                variant="body2"
                underline="hover"
                onClick={() => setResetNote(true)}
              >
                Forgot password?
              </MuiLink>
            </Stack>

            {resetNote ? (
              <Alert severity="info" sx={{ mb: 2 }} onClose={() => setResetNote(false)}>
                Password reset arrives with the backend. For now, ask an administrator.
              </Alert>
            ) : null}

            <Button type="submit" variant="contained" fullWidth disabled={submitting} sx={{ minHeight: 40 }}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </Box>

          {/* Development accounts — delete this block once real authentication exists */}
          <Divider sx={{ my: 3 }}>
            <Typography variant="caption">Development accounts</Typography>
          </Divider>

          <Stack spacing={0.75}>
            {(demoAccounts.data ?? []).map((account) => (
              <Box
                key={account.roleId}
                component="button"
                type="button"
                onClick={() => fillDemo(account)}
                aria-label={`Fill in credentials for ${account.name}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  px: 1.25,
                  py: 0.875,
                  borderRadius: 2,
                  border: `1px solid ${colors.border}`,
                  bgcolor: colors.surface,
                  '&:hover': { borderColor: colors.brand, bgcolor: colors.brandSoft },
                }}
              >
                <UserAvatar name={account.name} size={28} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {account.name}
                  </Typography>
                  <Typography variant="caption" component="p" noWrap>
                    {account.email}
                  </Typography>
                </Box>
                <ToneChip label={account.designation.split(' — ')[0]} tone={USER_TYPE_TONES[account.userTypeId] ?? 'slate'} />
              </Box>
            ))}
          </Stack>
          <Typography variant="caption" component="p" sx={{ mt: 1.25 }}>
            All development accounts use the password <strong>{DEMO_PASSWORD}</strong>. Click one to fill the form.
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
