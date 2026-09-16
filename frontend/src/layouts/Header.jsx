import { useEffect, useState } from 'react'
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
import { Bell, BellOff, Check, ChevronDown, KeyRound, LogOut, Menu as MenuIcon, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SearchField } from '@/components/SearchField'
import { UserAvatar } from '@/components/UserAvatar'
import { ChangePasswordDialog } from '@/features/auth/ChangePasswordDialog'
import { notificationService } from '@/api/notificationService'
import { ROUTES, workspaceViewPath } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { useSession } from '@/hooks/useSession'
import { usePermissions } from '@/hooks/usePermissions'
import { PERMISSIONS } from '@/constants/permissions'
import { colors, layout } from '@/theme/tokens'
import { formatRelativeDay } from '@/utils/date'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'

export const Header = ({ onOpenSidebar }) => {
  const navigate = useNavigate()
  const { user, role, roles, switchRole, logout } = useSession()
  const { can } = usePermissions()
  const inbox = useAsync(notificationService.listNotifications, [])
  const notifications = inbox.data?.items ?? []

  const [search, setSearch] = useState('')
  const [notificationAnchor, setNotificationAnchor] = useState(null)
  const [profileAnchor, setProfileAnchor] = useState(null)
  const [passwordOpen, setPasswordOpen] = useState(false)

  const unreadCount = inbox.data?.unreadCount ?? 0

  useEffect(() => {
    const timer = setInterval(() => inbox.reload(), 60000)
    return () => clearInterval(timer)
  }, [inbox])

  const openNotification = async (notification) => {
    setNotificationAnchor(null)
    if (notification.unread) {
      try {
        await notificationService.markRead(notification.id)
      } catch {
        // ignore
      }
      inbox.reload()
    }
    if (notification.workspaceId) navigate(workspaceViewPath())
  }

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead()
    } catch {
      // ignore
    }
    inbox.reload()
  }

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

      {can(PERMISSIONS.EMPLOYEE_VIEW) ? (
        <Box component="form" onSubmit={submitSearch} sx={{ flex: 1, maxWidth: 420, minWidth: 0 }}>
          <SearchField
            value={search}
            onChange={setSearch}
            label="Search employees"
            placeholder="Search employees…"
            fullWidth
          />
        </Box>
      ) : (
        <Box sx={{ flex: 1 }} />
      )}

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
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.25 }}>
          <Typography variant="h4">Notifications</Typography>
          {unreadCount > 0 ? (
            <Typography
              component="button"
              type="button"
              variant="caption"
              onClick={markAllRead}
              sx={{ border: 0, bgcolor: 'transparent', color: colors.brand, cursor: 'pointer', fontWeight: 600, p: 0 }}
            >
              Mark all as read
            </Typography>
          ) : null}
        </Stack>
        <Divider />
        {notifications.length === 0 ? (
          <Stack spacing={0.75} sx={{ alignItems: 'center', px: 2, py: 3, color: colors.textSecondary }}>
            <BellOff size={22} strokeWidth={1.5} aria-hidden="true" />
            <Typography variant="body2">You're all caught up</Typography>
          </Stack>
        ) : null}
        {notifications.map((notification) => (
          <MenuItem
            key={notification.id}
            onClick={() => openNotification(notification)}
            sx={{ alignItems: 'flex-start', py: 1.25, whiteSpace: 'normal', bgcolor: notification.unread ? colors.brandSoft : 'transparent' }}
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
          onClick={() => {
            setProfileAnchor(null)
            setPasswordOpen(true)
          }}
        >
          <ListItemIcon>
            <KeyRound size={16} strokeWidth={1.75} aria-hidden="true" />
          </ListItemIcon>
          <ListItemText primary="Change password" slotProps={{ primary: { fontSize: '0.8125rem' } }} />
        </MenuItem>
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
      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </Box>
  )
}
