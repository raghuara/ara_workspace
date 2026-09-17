import { Box, Tab, Tabs, Typography } from '@mui/material'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { usePermissions } from '@/hooks/usePermissions'
import { colors, layout } from '@/theme/tokens'

export const AdminTabsLayout = ({ title, description, tabs }) => {
  const { pathname } = useLocation()
  const { can, canAny } = usePermissions()

  const allowed = (permission) => !permission || (Array.isArray(permission) ? canAny(permission) : can(permission))
  const visible = tabs.filter((tab) => allowed(tab.permission))
  const active = visible.find((tab) => pathname === tab.to || pathname.startsWith(`${tab.to}/`))

  if (!active && visible.length > 0) return <Navigate to={visible[0].to} replace />

  return (
    <Box>
      <Box
        sx={{
          bgcolor: colors.surface,
          borderBottom: `1px solid ${colors.border}`,
          position: 'sticky',
          top: 0,
          zIndex: 2,
        }}
      >
        <Box sx={{ maxWidth: layout.contentMaxWidth, mx: 'auto', px: { xs: 2, md: 3, lg: 4 }, pt: { xs: 2, md: 2.5 } }}>
          <Typography variant="h2" component="h1">
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, mb: 1 }}>
            {description}
          </Typography>
          <Tabs
            value={active?.to ?? false}
            variant="scrollable"
            scrollButtons="auto"
            aria-label={`${title} sections`}
            sx={{ mx: -1 }}
          >
            {visible.map((tab) => (
              <Tab
                key={tab.to}
                value={tab.to}
                label={tab.label}
                component={Link}
                to={tab.to}
                icon={tab.icon ? <tab.icon size={15} strokeWidth={1.75} aria-hidden="true" /> : undefined}
                iconPosition="start"
                sx={{ minHeight: 44, px: 1.5 }}
              />
            ))}
          </Tabs>
        </Box>
      </Box>
      <Outlet />
    </Box>
  )
}
