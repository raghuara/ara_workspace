import { Box, List, ListItemButton, ListItemIcon, ListItemText, Stack, Tooltip, Typography } from '@mui/material'
import { Lock } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { NAVIGATION } from '@/constants/navigation'
import { ROUTES } from '@/constants/routes'
import logoUrl from '@/assets/logo.png'
import { WorkspaceNavTree } from './WorkspaceNavTree'
import { navRowSx, sectionLabelSx, sectionSx } from './navRowSx'
import { usePermissions } from '@/hooks/usePermissions'
import { useFeatures } from '@/hooks/useFeatures'
import { colors, layout } from '@/theme/tokens'

const isPathActive = (pathname, to, end) =>
  end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`)

const NavItem = ({ item, active, onNavigate }) => (
  <ListItemButton
    component={Link}
    to={item.to}
    onClick={onNavigate}
    aria-current={active ? 'page' : undefined}
    sx={navRowSx(active)}
  >
    <ListItemIcon>
      <item.icon size={18} strokeWidth={active ? 2 : 1.75} aria-hidden="true" />
    </ListItemIcon>
    <ListItemText
      primary={item.label}
      slotProps={{ primary: { fontSize: '0.8125rem', fontWeight: active ? 600 : 500, noWrap: true } }}
    />
  </ListItemButton>
)

export const Sidebar = ({ onNavigate }) => {
  const { can } = usePermissions()
  const { isEnabled } = useFeatures()
  const { pathname } = useLocation()

  const isVisible = (item) =>
    (!item.permission || can(item.permission)) && (!item.feature || isEnabled(item.feature))

  return (
    <Box
      component="nav"
      aria-label="Main navigation"
      sx={{
        width: layout.sidebarWidth,
        height: '100%',
        bgcolor: colors.surface,
        borderRight: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        component={Link}
        to={ROUTES.dashboard}
        aria-label="ARA Workspace — go to dashboard"
        sx={{
          display: 'flex',
          alignItems: 'center',
          height: layout.headerHeight,
          px: 2.5,
          flexShrink: 0,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <Box
          component="img"
          src={logoUrl}
          alt="ARA Workspace"
          sx={{ height: 30, width: 'auto', display: 'block' }}
        />
      </Box>

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 2.5,
          py: 2,
          scrollbarWidth: 'thin',
          scrollbarColor: `${colors.border} transparent`,
        }}
      >
        <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {NAVIGATION.filter((item) => item.key === 'dashboard')
            .filter(isVisible)
            .map((item) => (
              <NavItem
                key={item.key}
                item={item}
                active={isPathActive(pathname, item.to, item.end)}
                onNavigate={onNavigate}
              />
            ))}

          <WorkspaceNavTree onNavigate={onNavigate} />

          {NAVIGATION.filter((item) => item.key !== 'dashboard').map((item) => {
            if (item.feature && !isEnabled(item.feature)) return null

            if (!item.children) {
              if (!isVisible(item)) return null
              return (
                <NavItem
                  key={item.key}
                  item={item}
                  active={isPathActive(pathname, item.to, item.end)}
                  onNavigate={onNavigate}
                />
              )
            }

            const visibleChildren = item.children.filter(isVisible)
            if (visibleChildren.length === 0) return null

            return (
              <Box key={item.key} component="section" sx={sectionSx}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', ...sectionLabelSx }}>
                  <Typography component="h2" sx={{ flex: 1, font: 'inherit', letterSpacing: 'inherit' }}>
                    {item.label}
                  </Typography>
                  {item.restricted ? (
                    <Tooltip title="Restricted module">
                      <Box sx={{ display: 'flex' }}>
                        <Lock size={12} strokeWidth={1.75} aria-label="Restricted module" />
                      </Box>
                    </Tooltip>
                  ) : null}
                </Stack>
                <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {visibleChildren.map((child) => (
                    <NavItem
                      key={child.key}
                      item={child}
                      active={isPathActive(pathname, child.to, child.end)}
                      onNavigate={onNavigate}
                    />
                  ))}
                </List>
              </Box>
            )
          })}
        </List>
      </Box>
    </Box>
  )
}
