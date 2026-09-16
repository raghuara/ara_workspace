import { useState } from 'react'
import {
  Badge,
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { Bell, Check, ChevronDown, LogOut, Menu as MenuIcon, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SearchField } from '@/components/SearchField'
import { UserAvatar } from '@/components/UserAvatar'
import { notificationService } from '@/api/notificationService'
import { ROUTES } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { useSession } from '@/hooks/useSession'
import { colors, layout } from '@/theme/tokens'
import { formatRelativeDay } from '@/utils/date'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'

export const Header = ({ onOpenSidebar }) => {
  const navigate = useNavigate()
  const { user, role, roles, switchRole, logout } = useSession()
  const { data: notifications } = useAsync(notificationService.listNotifications, [])

  const [search, setSearch] = useState('')
  const [notificationAnchor, setNotificationAnchor] = useState(null)
  const [profileAnchor, setProfileAnchor] = useState(null)

  const unreadCount = notifications?.filter((notification) => notification.unread).length ?? 0

  const submitSearch = (event) => {
    event.preventDefault()
    const term = search.trim()
    if (!term) return
    navigate(`${ROUTES.employees}?search=${encodeURIComponent(term)}`)
    setSearch('')
  }

  const handleRoleChange = async (roleId) => {
    setProfileAnchor(null)
    if (roleId !== role?.id) await switchRole(roleId)
  }

  return (
    <Box
      component="header"
      sx={{
        height: layout.headerHeight,
        flexShrink: 0,
        bgcolor: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1, md: 2 },
        px: { xs: 1.5, sm: 2, md: 3 },
      }}
    >
      <IconButton
        onClick={onOpenSidebar}
        aria-label="Open navigation"
        sx={{ display: { lg: 'none' }, ml: -0.5 }}
      >
        <MenuIcon size={20} strokeWidth={1.75} />
      </IconButton>

      <WorkspaceSwitcher />

      <Box component="form" onSubmit={submitSearch} sx={{ flex: 1, maxWidth: 420, minWidth: 0 }}>
        <SearchField
          value={search}
          onChange={setSearch}
          label="Search employees"
          placeholder="Search employees…"
          fullWidth
        />
      </Box>

      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', ml: 'auto' }}>
        <Tooltip title="Notifications">
          <IconButton
            onClick={(event) => setNotificationAnchor(event.currentTarget)}
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
          >
            <Badge
              badgeContent={unreadCount}
              color="primary"
              slotProps={{ badge: { style: { fontSize: 10, height: 16, minWidth: 16 } } }}
            >
              <Bell size={19} strokeWidth={1.75} />
            </Badge>
          </IconButton>
        </Tooltip>

        <Box
          component="button"
          type="button"
          onClick={(event) => setProfileAnchor(event.currentTarget)}
          aria-label="Account menu"
          aria-haspopup="menu"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            border: `1px solid ${colors.border}`,
            borderRadius: 2,
            bgcolor: 'transparent',
            cursor: 'pointer',
            px: 1,
            py: 0.5,
            ml: 0.5,
            '&:hover': { bgcolor: colors.neutralSoft },
          }}
        >
          <UserAvatar name={user?.name} size={30} />
          <Box sx={{ textAlign: 'left', display: { xs: 'none', md: 'block' }, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {user?.name}
            </Typography>
            <Typography variant="caption" component="p" noWrap>
              {role?.name}
            </Typography>
          </Box>
          <ChevronDown size={15} strokeWidth={1.75} color={colors.textSecondary} aria-hidden="true" />
        </Box>
      </Stack>

      <Menu
        anchorEl={notificationAnchor}
        open={Boolean(notificationAnchor)}
        onClose={() => setNotificationAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 340, maxWidth: '90vw' } } }}
      >
        <Typography variant="h4" sx={{ px: 2, py: 1.5 }}>
          Notifications
        </Typography>
        <Divider />
        {(notifications ?? []).map((notification) => (
          <MenuItem
            key={notification.id}
            onClick={() => setNotificationAnchor(null)}
            sx={{ alignItems: 'flex-start', py: 1.25, whiteSpace: 'normal' }}
          >
            <Box
              aria-hidden="true"
              sx={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                mt: 0.75,
                mr: 1.5,
                flexShrink: 0,
                bgcolor: notification.unread ? colors.brand : 'transparent',
              }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={notification.unread ? 600 : 500}>
                {notification.title}
              </Typography>
              <Typography variant="caption" component="p">
                {notification.body} · {formatRelativeDay(notification.createdOn)}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>

      <Menu
        anchorEl={profileAnchor}
        open={Boolean(profileAnchor)}
        onClose={() => setProfileAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 288 } } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="body2" fontWeight={600}>
            {user?.name}
          </Typography>
          <Typography variant="caption" component="p">
            {user?.email}
          </Typography>
        </Box>
        <Divider />
        {roles.length > 0 && (
          <>
            <Typography variant="subtitle2" component="p" sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
              Switch role
            </Typography>
            {roles.map((option) => (
              <MenuItem key={option.id} onClick={() => handleRoleChange(option.id)} sx={{ py: 1 }}>
                <ListItemIcon>
                  {option.id === role?.id ? (
                    <Check size={16} strokeWidth={2} color={colors.brand} aria-hidden="true" />
                  ) : (
                    <UserRound size={16} strokeWidth={1.75} aria-hidden="true" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={option.name}
                  secondary={option.description}
                  slotProps={{
                    primary: { fontSize: '0.8125rem', fontWeight: option.id === role?.id ? 600 : 500 },
                    secondary: { fontSize: '0.75rem' },
                  }}
                />
              </MenuItem>
            ))}
            <Divider />
          </>
        )}
        <MenuItem
          sx={{ py: 1.25 }}
          onClick={async () => {
            setProfileAnchor(null)
            await logout()
            navigate(ROUTES.login, { replace: true })
          }}
        >
          <ListItemIcon>
            <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
          </ListItemIcon>
          <ListItemText primary="Sign out" slotProps={{ primary: { fontSize: '0.8125rem' } }} />
        </MenuItem>
      </Menu>
    </Box>
  )
}
