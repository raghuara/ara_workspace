import { Box, List, ListItemButton, ListItemIcon, ListItemText, Stack, Tooltip, Typography } from '@mui/material'
import { Lock } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { NAVIGATION } from '@/constants/navigation'
import { usePermissions } from '@/hooks/usePermissions'
import { colors, layout } from '@/theme/tokens'

const isPathActive = (pathname, to, end) =>
  end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`)

const NavItem = ({ item, nested, active, onNavigate }) => (
  <ListItemButton
    component={Link}
    to={item.to}
    onClick={onNavigate}
    aria-current={active ? 'page' : undefined}
    sx={{
      borderRadius: 2,
      minHeight: 40,
      pl: nested ? 2 : 1.25,
      pr: 1.25,
      color: active ? colors.brandDark : colors.textSecondary,
      bgcolor: active ? colors.brandSoft : 'transparent',
      '&:hover': { bgcolor: active ? colors.brandSoft : colors.neutralSoft },
    }}
  >
    <ListItemIcon>
      <item.icon size={nested ? 16 : 18} strokeWidth={1.75} aria-hidden="true" />
    </ListItemIcon>
    <ListItemText
      primary={item.label}
      slotProps={{ primary: { fontSize: '0.875rem', fontWeight: active ? 600 : 500 } }}
    />
  </ListItemButton>
)

export const Sidebar = ({ onNavigate }) => {
  const { can } = usePermissions()
  const { pathname } = useLocation()

  const isVisible = (item) => !item.permission || can(item.permission)

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
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.25}
        sx={{
          height: layout.headerHeight,
          px: 2.5,
          borderBottom: `1px solid ${colors.border}`,
          flexShrink: 0,
        }}
      >
        <Box
          aria-hidden="true"
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.75,
            bgcolor: colors.brand,
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 700,
            fontSize: '0.875rem',
          }}
        >
          A
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" noWrap>
            ARA Workspace
          </Typography>
          <Typography variant="caption" component="p" noWrap>
            Employee &amp; Operations
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 2 }}>
        <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          {NAVIGATION.map((item) => {
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
              <Box key={item.key} component="section" sx={{ mt: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ px: 1.25, mb: 0.5 }}>
                  <item.icon size={14} strokeWidth={1.75} color={colors.textSecondary} aria-hidden="true" />
                  <Typography
                    variant="subtitle2"
                    component="h2"
                    sx={{ flex: 1, fontSize: '0.6875rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}
                  >
                    {item.label}
                  </Typography>
                  {item.restricted ? (
                    <Tooltip title="Restricted module">
                      <Box sx={{ display: 'flex', color: colors.textSecondary }}>
                        <Lock size={13} strokeWidth={1.75} aria-label="Restricted module" />
                      </Box>
                    </Tooltip>
                  ) : null}
                </Stack>
                <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                  {visibleChildren.map((child) => (
                    <NavItem
                      key={child.key}
                      item={child}
                      nested
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
