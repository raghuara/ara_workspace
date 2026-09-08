import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, CircularProgress, Stack, Typography } from '@mui/material'
import { sessionService } from '@/api/sessionService'
import { SessionContext } from './sessionContext'

export const SessionProvider = ({ children }) => {
  const [session, setSession] = useState(null)
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    Promise.all([sessionService.getSession(), sessionService.listRoles()])
      .then(([loadedSession, loadedRoles]) => {
        if (cancelled) return
        setSession(loadedSession)
        setRoles(loadedRoles)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const switchRole = useCallback(async (roleId) => {
    const updated = await sessionService.switchRole(roleId)
    setSession(updated)
    return updated
  }, [])

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      role: session?.role ?? null,
      permissions: session?.permissions ?? [],
      roles,
      switchRole,
    }),
    [session, roles, switchRole],
  )

  if (loading || !session) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'background.default',
        }}
      >
        <Stack spacing={2} alignItems="center">
          <CircularProgress size={28} />
          <Typography variant="body2" color="text.secondary">
            Loading ARA Workspace…
          </Typography>
        </Stack>
      </Box>
    )
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
