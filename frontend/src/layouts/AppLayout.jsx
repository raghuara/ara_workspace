import { useState } from 'react'
import { Box, Drawer } from '@mui/material'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { colors, layout } from '@/theme/tokens'

export const AppLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: colors.page }}>
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
        <Box component="main" sx={{ flex: 1, overflowY: 'auto' }}>
          <Box sx={{ maxWidth: layout.contentMaxWidth, mx: 'auto', px: { xs: 2, md: 3, lg: 4 }, py: { xs: 3, md: 4 } }}>
            <Outlet />
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
