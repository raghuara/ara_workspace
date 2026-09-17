import { useState } from 'react'

import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link as MuiLink,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

import {
  ArrowRight,
  BarChart3,
  CheckSquare,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Star,
  Users,
} from 'lucide-react'

import {
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import { isUnauthorized } from '@/api/httpClient'
import { ROUTES } from '@/constants/routes'
import { useSession } from '@/hooks/useSession'
import logoUrl from '@/assets/logo.png'
import officeUrl from '@/assets/office_workspace.png'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const adornment = (Icon) => (
  <InputAdornment position="start">
    <Icon
      size={16}
      strokeWidth={1.8}
      color="#718096"
      aria-hidden="true"
    />
  </InputAdornment>
)

export const LoginPage = () => {
  const { isAuthenticated, login } = useSession()
  const navigate = useNavigate()
  const location = useLocation()

  const [values, setValues] = useState({
    email: '',
    password: '',
    remember: true,
  })

  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [resetNote, setResetNote] = useState(false)

  if (isAuthenticated) {
    return (
      <Navigate
        to={location.state?.from?.pathname ?? ROUTES.dashboard}
        replace
      />
    )
  }

  const setField = (field) => (event) => {
    const value =
      field === 'remember'
        ? event.target.checked
        : event.target.value

    setValues((current) => ({
      ...current,
      [field]: value,
    }))

    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }))

    setFormError('')
  }

  const validate = () => {
    const next = {}

    if (!values.email.trim()) {
      next.email = 'Enter your email address.'
    } else if (!EMAIL_PATTERN.test(values.email.trim())) {
      next.email = 'That does not look like a valid email.'
    }

    if (!values.password) {
      next.password = 'Enter your password.'
    }

    return next
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validation = validate()

    setErrors(validation)

    if (Object.keys(validation).length > 0) {
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      await login({
        email: values.email.trim(),
        password: values.password,
        remember: values.remember,
      })

      navigate(
        location.state?.from?.pathname ?? ROUTES.dashboard,
        {
          replace: true,
        },
      )
    } catch (caught) {
      setFormError(
        isUnauthorized(caught)
          ? 'The email or password is incorrect.'
          : (caught.message ??
            'Sign in failed. Please try again.'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '100vh',
        '@supports (height: 100dvh)': { height: '100dvh' },
        overflow: 'hidden',

        display: 'grid',

        /*
         * Keep the two sections almost equal.
         * This prevents the left side from becoming
         * disproportionately large on wide screens.
         */
        gridTemplateColumns: {
          xs: '1fr',
          md: 'minmax(0, 1fr) minmax(380px, 0.95fr)',
        },

        bgcolor: '#F7F9FC',
      }}
    >
      {/* =========================================================
          LEFT SIDE
      ========================================================= */}

      <Box
        sx={{
          position: 'relative',
          height: '100%',
          minWidth: 0,

          overflow: 'hidden',

          display: {
            xs: 'none',
            md: 'block',
          },

          bgcolor: '#1B2433',
        }}
      >
        {/* -------------------------------------------------------
            OFFICE BACKGROUND
        ------------------------------------------------------- */}

        <Box
          component="img"
          src={officeUrl}
          alt=""
          sx={{
            position: 'absolute',
            inset: 0,

            width: '100%',
            height: '100%',

            objectFit: 'cover',
            objectPosition: 'center center',

            display: 'block',

            /*
             * IMPORTANT:
             *
             * Previously brightness was 0.58.
             * This was making the image too dark.
             */
            filter: 'brightness(0.94)',
          }}
        />

        {/* -------------------------------------------------------
            LIGHT BLACK OVERLAY
        ------------------------------------------------------- */}

        <Box
          sx={{
            position: 'absolute',
            inset: 0,

            /*
             * Only a small amount of black overlay.
             * The image should remain clearly visible.
             */
            background: `
              linear-gradient(
                90deg,
                rgba(8, 15, 28, 0.34) 0%,
                rgba(8, 15, 28, 0.14) 55%,
                rgba(8, 15, 28, 0.04) 100%
              )
            `,

            pointerEvents: 'none',
          }}
        />

        {/* -------------------------------------------------------
            VERY SUBTLE BLUE GLOW
        ------------------------------------------------------- */}

        <Box
          sx={{
            position: 'absolute',

            width: {
              md: 280,
              lg: 360,
            },

            height: {
              md: 280,
              lg: 360,
            },

            borderRadius: '50%',

            top: -180,
            left: -150,

            background:
              'radial-gradient(circle, rgba(37,99,235,0.14) 0%, rgba(37,99,235,0) 70%)',

            pointerEvents: 'none',
          }}
        />

        {/* =======================================================
            LEFT CONTENT
        ======================================================= */}

        <Box
          sx={{
            position: 'relative',
            zIndex: 2,

            width: '100%',
            height: '100%',

            boxSizing: 'border-box',

            px: {
              md: 4,
              lg: 5,
              xl: 6,
            },

            py: {
              md: 3,
              lg: 4,
            },

            display: 'flex',
            flexDirection: 'column',

            /*
             * Important:
             * Don't allow the content itself to create
             * a vertical scrollbar.
             */
            overflow: 'hidden',
          }}
        >
          {/* =====================================================
              TOP BAR
          ===================================================== */}

          <Stack
            direction="row"
            spacing={1.25}
            sx={{
              alignItems: 'center',
              flexShrink: 0,
              color: 'rgba(255,255,255,0.72)',
            }}
          >
            <Box
              aria-hidden="true"
              sx={{
                width: 24,
                height: 2,
                borderRadius: 999,
                bgcolor: '#3B82F6',
              }}
            />

            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
              }}
            >
              Organize · Execute · Achieve
            </Typography>
          </Stack>

          {/* =====================================================
              HERO
          ===================================================== */}

          <Box
            sx={{
              mt: {
                md: 'clamp(50px, 9vh, 90px)',
                lg: 'clamp(55px, 10vh, 100px)',
              },

              maxWidth: {
                md: 440,
                lg: 500,
              },

              flexShrink: 0,
            }}
          >
            <Typography
              component="h1"
              sx={{
                /*
                 * clamp prevents the huge heading at 100%.
                 */
                fontSize:
                  'clamp(1.75rem, 2.8vw, 2.625rem)',

                lineHeight: 1.02,

                fontWeight: 800,

                letterSpacing: '-0.045em',

                color: '#FFFFFF',

                mb: {
                  md: 2,
                  lg: 2.3,
                },
              }}
            >
              Turn{' '}
              <Box
                component="span"
                sx={{
                  color: '#3B82F6',
                }}
              >
                Tasks
              </Box>

              <br />

              into Progress
            </Typography>

            <Typography
              sx={{
                color: 'rgba(255,255,255,0.82)',

                fontSize: {
                  md: 12,
                  lg: 13,
                  xl: 14,
                },

                lineHeight: 1.55,

                maxWidth: 420,
              }}
            >
              Plan your day, track your work and
              achieve more — together.
            </Typography>
          </Box>

          {/* =====================================================
              FEATURES
          ===================================================== */}

          <Stack
            spacing={{
              md: 1.4,
              lg: 1.7,
            }}
            sx={{
              mt: {
                md: 3.5,
                lg: 4,
              },

              maxWidth: 380,

              flexShrink: 0,
            }}
          >
            <FeatureRow
              icon={<CheckSquare size={18} />}
              background="rgba(59,130,246,0.24)"
              iconColor="#60A5FA"
              title="Manage Tasks"
              description="Keep your work organized"
            />

            <FeatureRow
              icon={<BarChart3 size={18} />}
              background="rgba(16,185,129,0.22)"
              iconColor="#34D399"
              title="Track Progress"
              description="See what's getting done"
            />

            <FeatureRow
              icon={<Users size={18} />}
              background="rgba(139,92,246,0.24)"
              iconColor="#A78BFA"
              title="Collaborate"
              description="Work together, stay aligned"
            />

            <FeatureRow
              icon={<Star size={18} />}
              background="rgba(245,158,11,0.22)"
              iconColor="#FBBF24"
              title="Achieve Goals"
              description="Small steps, big results"
            />
          </Stack>

          {/* =====================================================
              BOTTOM QUOTE
          ===================================================== */}

          <Box
            sx={{
              mt: 'auto',

              pt: 2,

              flexShrink: 0,
            }}
          >
            <Typography
              sx={{
                color: '#FFFFFF',

                fontSize: {
                  md: 17,
                  lg: 19,
                  xl: 21,
                },

                fontWeight: 500,

                fontStyle: 'italic',

                fontFamily:
                  '"Brush Script MT", "Segoe Script", cursive',

                lineHeight: 1.1,
              }}
            >
              "Progress
              <br />
              every day."
            </Typography>

            <Box
              sx={{
                width: 90,
                height: 2,

                bgcolor: '#2563EB',

                transform: 'rotate(-4deg)',

                mt: 0.8,
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* =========================================================
          RIGHT SIDE
      ========================================================= */}

      <Box
        sx={{
          position: 'relative',

          height: '100%',

          minWidth: 0,

          display: 'flex',

          alignItems: 'center',
          justifyContent: 'center',

          boxSizing: 'border-box',

          px: {
            xs: 2,
            sm: 3,
            md: 4,
            lg: 5,
          },

          py: {
            xs: 3,
            md: 3,
          },

          overflow: 'hidden',

          background: `
            radial-gradient(
              450px 300px at 100% 100%,
              rgba(59,130,246,0.08),
              transparent 70%
            ),
            #F8FAFD
          `,
        }}
      >
        {/* =======================================================
            TOP RIGHT
        ======================================================= */}

        <Stack
          direction="row"
          spacing={0.7}
          sx={{
            position: 'absolute',

            top: {
              xs: 18,
              md: 24,
              lg: 28,
            },

            right: {
              xs: 18,
              md: 25,
              lg: 32,
            },

            alignItems: 'center',
          }}
        >
          <Typography
            sx={{
              fontSize: 12,
              color: '#718096',
            }}
          >
            New here?
          </Typography>

          <MuiLink
            component="button"
            type="button"
            underline="hover"
            sx={{
              border: 0,
              background: 'transparent',

              cursor: 'pointer',

              padding: 0,

              fontSize: 12,
              fontWeight: 600,

              color: '#2563EB',
            }}
          >
            Contact Admin
          </MuiLink>
        </Stack>

        {/* =======================================================
            LOGIN CARD
        ======================================================= */}

        <Box
          sx={{
            width: '100%',

            /*
             * Smaller than previous 520.
             * This is one of the main fixes for 100% zoom.
             */
            maxWidth: 410,

            maxHeight: 'calc(100vh - 70px)',

            bgcolor: '#FFFFFF',

            border: '1px solid #E3E8EF',

            borderRadius: '14px',

            boxShadow:
              '0 12px 35px rgba(15,23,42,0.07), 0 2px 5px rgba(15,23,42,0.03)',

            boxSizing: 'border-box',

            px: {
              xs: 2.5,
              sm: 3,
              md: 3.5,
            },

            py: {
              xs: 2.5,
              sm: 3,
              md: 3.5,
            },

            overflow: 'hidden',
          }}
        >
          {/* ===================================================
              LOGO
          =================================================== */}

          <Box
            component="img"
            src={logoUrl}
            alt="ARA Workspace"
            sx={{
              width: {
                xs: 145,
                sm: 155,
                md: 165,
              },

              height: 'auto',

              display: 'block',

              mb: {
                xs: 3,
                md: 3.5,
              },
            }}
          />

          {/* ===================================================
              HEADING
          =================================================== */}

          <Typography
            component="h2"
            sx={{
              fontSize: {
                xs: 22,
                sm: 24,
                md: 24,
              },

              lineHeight: 1.15,

              fontWeight: 800,

              letterSpacing: '-0.035em',

              color: '#111827',

              mb: 0.7,
            }}
          >
            Welcome back
          </Typography>

          <Typography
            sx={{
              color: '#64748B',

              fontSize: {
                xs: 12,
                md: 13,
              },

              lineHeight: 1.5,

              mb: 2.5,
            }}
          >
            Sign in to continue to your workspace.
          </Typography>

          {/* ===================================================
              FORM
          =================================================== */}

          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
          >
            {/* API ERROR */}

            {formError ? (
              <Alert
                severity="error"
                sx={{
                  mb: 1.5,
                  borderRadius: 1.5,
                  fontSize: 12,
                }}
                role="alert"
              >
                {formError}
              </Alert>
            ) : null}

            {/* =================================================
                EMAIL
            ================================================= */}

            <TextField
              label="Email address"
              type="email"
              value={values.email}
              onChange={setField('email')}
              error={Boolean(errors.email)}
              helperText={errors.email ?? ' '}
              fullWidth
              required
              autoFocus
              autoComplete="email"
              size="small"
              slotProps={{
                htmlInput: {
                  inputMode: 'email',
                },

                input: {
                  startAdornment: adornment(Mail),
                },
              }}
              sx={{
                mb: 0.2,

                '& .MuiInputLabel-root': {
                  fontSize: 12,
                  color: '#64748B',
                },

                '& .MuiInputBase-input': {
                  fontSize: 13,
                },

                '& .MuiOutlinedInput-root': {
                  minHeight: 42,

                  borderRadius: '8px',

                  backgroundColor: '#FFFFFF',

                  '& fieldset': {
                    borderColor: '#D7DEE9',
                  },

                  '&:hover fieldset': {
                    borderColor: '#AAB7C8',
                  },

                  '&.Mui-focused fieldset': {
                    borderColor: '#2563EB',
                    borderWidth: 1.3,
                  },
                },

                '& .MuiFormHelperText-root': {
                  minHeight: 18,

                  fontSize: 10.5,

                  ml: 0.3,
                },
              }}
            />

            {/* =================================================
                PASSWORD
            ================================================= */}

            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={values.password}
              onChange={setField('password')}
              error={Boolean(errors.password)}
              helperText={errors.password ?? ' '}
              fullWidth
              required
              autoComplete="current-password"
              size="small"
              slotProps={{
                input: {
                  startAdornment:
                    adornment(LockKeyhole),

                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() =>
                          setShowPassword(
                            (current) => !current,
                          )
                        }
                        aria-label={
                          showPassword
                            ? 'Hide password'
                            : 'Show password'
                        }
                        aria-pressed={showPassword}
                        edge="end"
                      >
                        {showPassword ? (
                          <EyeOff
                            size={15}
                            strokeWidth={1.8}
                          />
                        ) : (
                          <Eye
                            size={15}
                            strokeWidth={1.8}
                          />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                mb: 0.2,

                '& .MuiInputLabel-root': {
                  fontSize: 12,
                  color: '#64748B',
                },

                '& .MuiInputBase-input': {
                  fontSize: 13,
                },

                '& .MuiOutlinedInput-root': {
                  minHeight: 42,

                  borderRadius: '8px',

                  '& fieldset': {
                    borderColor: '#D7DEE9',
                  },

                  '&:hover fieldset': {
                    borderColor: '#AAB7C8',
                  },

                  '&.Mui-focused fieldset': {
                    borderColor: '#2563EB',
                    borderWidth: 1.3,
                  },
                },

                '& .MuiFormHelperText-root': {
                  minHeight: 18,

                  fontSize: 10.5,

                  ml: 0.3,
                },
              }}
            />

            {/* =================================================
                REMEMBER / FORGOT
            ================================================= */}

            <Stack
              direction="row"
              sx={{
                alignItems: 'center',
                justifyContent: 'space-between',

                mb: 2,
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={values.remember}
                    onChange={setField('remember')}
                    sx={{
                      p: 0.5,

                      color: '#CBD5E1',

                      '&.Mui-checked': {
                        color: '#2563EB',
                      },
                    }}
                  />
                }
                label={
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: '#334155',
                    }}
                  >
                    Keep me signed in
                  </Typography>
                }
                sx={{
                  mr: 0,
                }}
              />

              <MuiLink
                component="button"
                type="button"
                underline="hover"
                onClick={() => setResetNote(true)}
                sx={{
                  border: 0,
                  background: 'transparent',

                  cursor: 'pointer',

                  p: 0,

                  fontSize: 12,

                  color: '#2563EB',
                }}
              >
                Forgot password?
              </MuiLink>
            </Stack>

            {/* RESET MESSAGE */}

            {resetNote ? (
              <Alert
                severity="info"
                sx={{
                  mb: 1.5,
                  borderRadius: 1.5,
                  fontSize: 11,
                }}
                onClose={() => setResetNote(false)}
              >
                Ask your administrator to reset your
                password — you will get a temporary one
                to sign in with.
              </Alert>
            ) : null}

            {/* =================================================
                SIGN IN
            ================================================= */}

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={submitting}
              endIcon={
                <ArrowRight
                  size={15}
                  strokeWidth={2}
                />
              }
              sx={{
                minHeight: 42,

                borderRadius: '8px',

                textTransform: 'none',

                fontSize: 13,

                fontWeight: 700,

                background:
                  'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',

                boxShadow:
                  '0 6px 15px rgba(37,99,235,0.20)',

                '&:hover': {
                  background:
                    'linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%)',

                  boxShadow:
                    '0 8px 18px rgba(37,99,235,0.25)',
                },

                '&:disabled': {
                  background: '#93B4F5',
                  color: '#FFFFFF',
                },
              }}
            >
              {submitting
                ? 'Signing in…'
                : 'Sign in'}
            </Button>
          </Box>

          {/* ===================================================
              ADMIN MESSAGE
          =================================================== */}

          <Typography
            sx={{
              textAlign: 'center',

              color: '#64748B',

              fontSize: {
                xs: 11,
                md: 12,
              },

              lineHeight: 1.5,

              mt: 2.5,
            }}
          >
            Accounts are created by your workspace
            administrator.
          </Typography>

          {/* ===================================================
              FOOTER
          =================================================== */}

          <Typography
            sx={{
              textAlign: 'center',

              color: '#94A3B8',

              fontSize: 10.5,

              mt: 2.5,
            }}
          >
            © {new Date().getFullYear()} ARA Workspace.
            All rights reserved.
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

/* =============================================================
   FEATURE ROW
============================================================= */

const FeatureRow = ({
  icon,
  background,
  iconColor,
  title,
  description,
}) => {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="center"
    >
      <Box
        sx={{
          width: {
            md: 38,
            lg: 40,
          },

          height: {
            md: 38,
            lg: 40,
          },

          flexShrink: 0,

          borderRadius: '10px',

          display: 'flex',

          alignItems: 'center',
          justifyContent: 'center',

          background,

          color: iconColor,

          backdropFilter: 'blur(8px)',
        }}
      >
        {icon}
      </Box>

      <Box>
        <Typography
          sx={{
            color: '#FFFFFF',

            fontSize: {
              md: 12,
              lg: 13,
            },

            fontWeight: 700,

            lineHeight: 1.25,

            mb: 0.2,
          }}
        >
          {title}
        </Typography>

        <Typography
          sx={{
            color: 'rgba(255,255,255,0.70)',

            fontSize: {
              md: 11,
              lg: 11.5,
            },

            lineHeight: 1.3,
          }}
        >
          {description}
        </Typography>
      </Box>
    </Stack>
  )
}