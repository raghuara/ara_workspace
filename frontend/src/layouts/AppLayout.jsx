import { useState } from 'react'
import { Box, Drawer } from '@mui/material'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { WorkspaceProvider } from '@/features/workspace/WorkspaceProvider'
import { colors, layout } from '@/theme/tokens'

export const AppLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <WorkspaceProvider>
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
          <Box component="main" sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            <Outlet />
          </Box>
        </Box>
      </Box>
    </WorkspaceProvider>
  )
}
