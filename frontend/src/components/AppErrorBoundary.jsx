import { Component } from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'
import { RefreshCw, TriangleAlert } from 'lucide-react'
import { colors } from '@/theme/tokens'

/**
 * Last line of defence. React unmounts the whole tree on an uncaught render
 * error, which shows as a blank page with nothing to act on. This catches it.
 *
 * What is shown depends on the build. In development the message and stack are
 * on screen so the cause can be fixed on the spot. In production the user gets
 * a calm, non-technical message plus a short reference code that also goes to
 * the console, so support can match a report to the logged error without ever
 * exposing internals to the person looking at it.
 *
 * A class because React still has no hook equivalent for componentDidCatch.
 */
const isDev = import.meta.env.DEV

const makeReference = () => {
  const stamp = Date.now().toString(36).toUpperCase().slice(-5)
  const rand = Math.random().toString(36).toUpperCase().slice(2, 5)
  return `${stamp}-${rand}`
}

const cardStyles = {
  width: '100%',
  maxWidth: 640,
  bgcolor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 2.5,
  p: 3,
}

const detailStyles = {
  m: 0,
  mb: 2,
  p: 1.5,
  borderRadius: 2,
  bgcolor: colors.page,
  border: `1px solid ${colors.border}`,
  fontSize: '0.75rem',
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  maxHeight: 220,
  overflow: 'auto',
}

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, reference: null }
  }

  static getDerivedStateFromError(error) {
    return { error, reference: makeReference() }
  }

  componentDidCatch(error, info) {
    // Always logged, so the on-screen reference can be matched to the console
    // now, or to an error-reporting service later.
    console.error(`[ARA Workspace] render error ${this.state.reference}:`, error, info?.componentStack)
  }

  render() {
    const { error, reference } = this.state
    if (!error) return this.props.children

    const stack = error?.stack ? error.stack.split('\n').slice(1, 6).join('\n') : ''

    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: colors.page, p: 3 }}>
        <Box sx={cardStyles}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', mb: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                bgcolor: colors.dangerSoft,
                color: colors.danger,
                flexShrink: 0,
              }}
            >
              <TriangleAlert size={20} strokeWidth={1.75} aria-hidden="true" />
            </Box>
            <Box>
              <Typography variant="h3">Something went wrong</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {isDev
                  ? 'The app hit an error while drawing the screen. The message below points at the cause.'
                  : 'This page could not be displayed. Reloading usually fixes it. If it keeps happening, contact your administrator and quote the reference below.'}
              </Typography>
            </Box>
          </Stack>

          {isDev ? (
            <Box component="pre" sx={detailStyles}>
              {error?.message ?? String(error)}
              {stack ? `\n\n${stack}` : ''}
            </Box>
          ) : (
            <Typography variant="body2" sx={{ mb: 2 }}>
              Reference:{' '}
              <Box component="strong" sx={{ fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                {reference}
              </Box>
            </Typography>
          )}

          <Stack direction="row" spacing={1}>
            <Button variant="contained" startIcon={<RefreshCw size={15} strokeWidth={1.75} />} onClick={() => window.location.reload()}>
              Reload
            </Button>
            <Button variant="outlined" onClick={() => window.location.assign('/')}>
              Go to dashboard
            </Button>
          </Stack>
        </Box>
      </Box>
    )
  }
}
