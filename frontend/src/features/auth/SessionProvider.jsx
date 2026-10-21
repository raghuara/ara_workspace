import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { authService } from '@/api/authService'
import { sessionService } from '@/api/sessionService'
import { isUnauthorized } from '@/api/httpClient'
import { queryClient } from '@/api/queryClient'
import { SessionContext } from './sessionContext'
import logoUrl from '@/assets/logo.png'
import { socket } from '@/api/socketClient'

const STATUS = {
  LOADING: 'loading',
  ANONYMOUS: 'anonymous',
  AUTHENTICATED: 'authenticated',
  UNREACHABLE: 'unreachable',
}

export const SessionProvider = ({ children }) => {
  const [session, setSession] = useState(null)
  const [roles, setRoles] = useState([])
  const [status, setStatus] = useState(STATUS.LOADING)
  const [attempt, setAttempt] = useState(0)
  const [failure, setFailure] = useState('')

  // Keeps the real-time connection tied to the sign-in state. The events
  // themselves are handled by RealtimeSync, inside the workspace provider.
  useEffect(() => {
    if (status !== STATUS.AUTHENTICATED) {
      socket.disconnect()
      return
    }

    const handleConnectError = (error) => {
      console.error('Real-time connection failed:', error.message)
    }

    socket.on('connect_error', handleConnectError)
    socket.connect()

    return () => {
      socket.off('connect_error', handleConnectError)
      socket.disconnect()
    }
  }, [status])

  // Load the existing session.
  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      let loaded = null

      try {
        loaded = await sessionService.getSession()
      } catch (caught) {
        if (!isUnauthorized(caught)) {
          if (!cancelled) {
            setFailure(caught?.message ?? 'The server could not be reached.')
            setStatus(STATUS.UNREACHABLE)
          }
          return
        }
      }

      if (cancelled) return

      if (!loaded) {
        setStatus(STATUS.ANONYMOUS)
        return
      }

      const loadedRoles = await sessionService.listRoles().catch(() => [])
      if (cancelled) return

      setSession(loaded)
      setRoles(loadedRoles)
      setStatus(STATUS.AUTHENTICATED)
    }

    bootstrap().catch((caught) => {
      if (cancelled) return

      setFailure(caught?.message ?? 'Something went wrong while starting the app.')
      setStatus(STATUS.UNREACHABLE)
    })

    return () => {
      cancelled = true
    }
  }, [attempt])

  const login = useCallback(async (credentials) => {
    const result = await authService.login(credentials)
    queryClient.clear()

    const loadedRoles = await sessionService.listRoles().catch(() => [])

    setSession(result.session)
    setRoles(loadedRoles)
    setStatus(STATUS.AUTHENTICATED)

    return result.session
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    queryClient.clear()

    setSession(null)
    setRoles([])
    setStatus(STATUS.ANONYMOUS)
  }, [])

  const switchRole = useCallback(async (roleId) => {
    const updated = await sessionService.switchRole(roleId)
    queryClient.clear()
    setSession(updated)

    return updated
  }, [])

  // Reload session details after feature or permission changes.
  const refreshSession = useCallback(async () => {
    const updated = await sessionService.getSession()
    setSession(updated)

    return updated
  }, [])

  const value = useMemo(
    () => ({
      isAuthenticated: status === STATUS.AUTHENTICATED,
      user: session?.user ?? null,
      userType: session?.userType ?? null,
      role: session?.role ?? null,
      permissions: session?.permissions ?? [],
      features: session?.features ?? {},
      workspaceIds: session?.workspaceIds ?? [],
      mustChangePassword: Boolean(session?.mustChangePassword),
      roles,
      login,
      logout,
      switchRole,
      refreshSession,
    }),
    [status, session, roles, login, logout, switchRole, refreshSession],
  )

  if (status === STATUS.UNREACHABLE) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'background.default',
          p: 3,
        }}
      >
        <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', maxWidth: 420 }}>
          <Box component="img" src={logoUrl} alt="ARA Workspace" sx={{ height: 34, width: 'auto' }} />

          <Typography variant="h3">Can't reach the server</Typography>

          <Typography variant="body2" color="text.secondary">
            {failure} Make sure the backend is running on the address in{' '}
            <code>VITE_API_URL</code>, then try again.
          </Typography>

          <Button
            variant="contained"
            onClick={() => {
              setStatus(STATUS.LOADING)
              setAttempt((n) => n + 1)
            }}
          >
            Try again
          </Button>
        </Stack>
      </Box>
    )
  }

  if (status === STATUS.LOADING) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'background.default',
        }}
      >
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <Box component="img" src={logoUrl} alt="ARA Workspace" sx={{ height: 34, width: 'auto' }} />
          <CircularProgress size={26} />
          <Typography variant="body2" color="text.secondary">
            Loading your workspace…
          </Typography>
        </Stack>
      </Box>
    )
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
