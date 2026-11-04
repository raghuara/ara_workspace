import { Suspense, useEffect, useState } from 'react'
import { Box, Drawer } from '@mui/material'
import { Outlet } from 'react-router-dom'
import { preloadPages } from '@/routes/pagePreload'
import { ContentFallback } from './ContentFallback'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { TopProgress } from './TopProgress'
import { WorkspaceProvider } from '@/features/workspace/WorkspaceProvider'
import { PeriodProvider } from '@/features/workspace/PeriodProvider'
import { RealtimeSync } from '@/features/workspace/RealtimeSync'
import { ChangePasswordDialog } from '@/features/auth/ChangePasswordDialog'
import { useSession } from '@/hooks/useSession'
import { colors, layout } from '@/theme/tokens'

export const AppLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { mustChangePassword } = useSession()

  useEffect(() => {
    preloadPages()
  }, [])

  return (
    <WorkspaceProvider>
      <RealtimeSync />
      <PeriodProvider>
        <Box
          sx={{
            display: 'flex',
            bgcolor: colors.page,
            height: '100vh',
            // dvh tracks the mobile address bar; vh does not.
            '@supports (height: 100dvh)': { height: '100dvh' },
          }}
        >
          <Box sx={{ display: { xs: 'none', lg: 'block' }, flexShrink: 0 }}>
            <Sidebar />
          </Box>

          <Drawer
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            sx={{ display: { lg: 'none' } }}
            slotProps={{ paper: { sx: { width: layout.sidebarWidth, border: 0 } } }}
          >
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </Drawer>

          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <Header onOpenSidebar={() => setMobileOpen(true)} />
            <Box sx={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
              <TopProgress />
              <Box component="main" sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                <Suspense fallback={<ContentFallback />}>
                  <Outlet />
                </Suspense>
              </Box>
            </Box>
          </Box>
        </Box>
        <ChangePasswordDialog open={mustChangePassword} forced onClose={() => {}} />
      </PeriodProvider>
    </WorkspaceProvider>
  )
}
