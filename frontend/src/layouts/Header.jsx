import { useEffect, useState } from 'react'
import { Badge, Box, Divider, IconButton, Menu, MenuItem, Stack, Tooltip, Typography } from '@mui/material'
import { Bell, BellOff, Check, ChevronDown, KeyRound, LogOut, Menu as MenuIcon, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ToneChip } from '@/components/ToneChip'
import { UserAvatar } from '@/components/UserAvatar'
import { ChangePasswordDialog } from '@/features/auth/ChangePasswordDialog'
import { notificationService } from '@/api/notificationService'
import { ROUTES, workspaceViewPath } from '@/constants/routes'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { useAsync } from '@/hooks/useAsync'
import { useSession } from '@/hooks/useSession'
import { colors, layout } from '@/theme/tokens'
import { formatRelativeDay } from '@/utils/date'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'
import { FiscalYearPicker } from '@/components/FiscalYearPicker'
import { useWorkspace } from '@/hooks/useWorkspace'

const menuPaper = (width) => ({
  paper: {
    sx: {
      width,
      maxWidth: 'calc(100vw - 24px)',
      mt: 1,
      borderRadius: 2.5,
      boxShadow: '0 16px 40px rgba(15, 23, 42, 0.14), 0 2px 6px rgba(15, 23, 42, 0.06)',
    },
  },
  list: { sx: { py: 0.75 } },
})

const itemSx = {
  mx: 0.75,
  my: 0.125,
  px: 1.25,
  py: 0.875,
  borderRadius: 1.5,
  gap: 1.25,
  alignItems: 'center',
}

const sectionLabelSx = {
  px: 2,
  pt: 1,
  pb: 0.5,
  fontSize: '0.6875rem',
  fontWeight: 700,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  color: colors.textSecondary,
}

export const Header = ({ onOpenSidebar }) => {
  const navigate = useNavigate()
  const { user, role, roles, switchRole, logout } = useSession()
  const { activeWorkspace } = useWorkspace()
  const inbox = useAsync(notificationService.listNotifications, [])
  const notifications = inbox.data?.items ?? []

  const [notificationAnchor, setNotificationAnchor] = useState(null)
  const [profileAnchor, setProfileAnchor] = useState(null)
  const [passwordOpen, setPasswordOpen] = useState(false)

  const unreadCount = inbox.data?.unreadCount ?? 0
  const profileOpen = Boolean(profileAnchor)

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
      <IconButton onClick={onOpenSidebar} aria-label="Open navigation" sx={{ display: { lg: 'none' }, ml: -0.5 }}>
        <MenuIcon size={20} strokeWidth={1.75} />
      </IconButton>

      <WorkspaceSwitcher />

      {activeWorkspace ? <FiscalYearPicker /> : null}

      <Box sx={{ flex: 1 }} />

      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
        <Tooltip title="Notifications">
          <IconButton
            onClick={(event) => setNotificationAnchor(event.currentTarget)}
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
            sx={{ width: 40, height: 40, borderRadius: 2 }}
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
          aria-expanded={profileOpen}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            height: 40,
            pl: 0.5,
            pr: { xs: 0.5, md: 1 },
            border: 0,
            borderRadius: 999,
            bgcolor: profileOpen ? colors.brandSoft : 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            font: 'inherit',
            transition: 'background-color 140ms ease, box-shadow 140ms ease, transform 120ms ease',
            '&:hover': { bgcolor: profileOpen ? colors.brandSoft : colors.neutralSoft },
            '&:active': { transform: 'scale(0.985)' },
            '&:focus-visible': { outline: 'none', boxShadow: `0 0 0 2px ${colors.surface}, 0 0 0 4px ${colors.brand}` },
          }}
        >
          <UserAvatar name={user?.name} size={32} />
          <Box sx={{ display: { xs: 'none', md: 'block' }, minWidth: 0, maxWidth: 180 }}>
            <Typography variant="body2" fontWeight={600} noWrap sx={{ lineHeight: 1.25, color: colors.textPrimary }}>
              {user?.name}
            </Typography>
            <Typography variant="caption" component="p" noWrap sx={{ lineHeight: 1.25 }}>
              {role?.name}
            </Typography>
          </Box>
          <Box
            sx={{
              display: { xs: 'none', md: 'inline-flex' },
              color: colors.textSecondary,
              transition: 'transform 160ms ease',
              transform: profileOpen ? 'rotate(180deg)' : 'none',
            }}
          >
            <ChevronDown size={14} strokeWidth={1.75} aria-hidden="true" />
          </Box>
        </Box>
      </Stack>

      <Menu
        anchorEl={notificationAnchor}
        open={Boolean(notificationAnchor)}
        onClose={() => setNotificationAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={menuPaper(340)}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, pt: 0.75, pb: 1 }}>
          <Typography variant="h4">Notifications</Typography>
          {unreadCount > 0 ? (
            <Typography
              component="button"
              type="button"
              variant="caption"
              onClick={markAllRead}
              sx={{ border: 0, bgcolor: 'transparent', color: colors.brand, cursor: 'pointer', fontWeight: 600, p: 0, font: 'inherit', fontSize: '0.75rem' }}
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
            sx={{ ...itemSx, alignItems: 'flex-start', whiteSpace: 'normal', bgcolor: notification.unread ? colors.brandSoft : 'transparent' }}
          >
            <Box
              aria-hidden="true"
              sx={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                mt: 0.75,
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
        open={profileOpen}
        onClose={() => setProfileAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={menuPaper(304)}
      >
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: 'center',
            mx: 0.75,
            mt: 0.25,
            mb: 0.5,
            px: 1.5,
            py: 1.5,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${colors.brandSoft} 0%, ${colors.surface} 100%)`,
            border: `1px solid ${colors.border}`,
          }}
        >
          <UserAvatar name={user?.name} size={44} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 650, lineHeight: 1.3 }} noWrap>
              {user?.name}
            </Typography>
            <Typography variant="caption" component="p" noWrap sx={{ lineHeight: 1.3, mb: 0.75 }}>
              {user?.email}
            </Typography>
            <ToneChip label={role?.name ?? 'Member'} tone="blue" icon={ShieldCheck} />
          </Box>
        </Stack>

        {roles.length > 1 ? (
          <Box>
            <Typography component="p" sx={sectionLabelSx}>
              Switch role
            </Typography>
            {roles.map((option) => {
              const selected = option.id === role?.id
              return (
                <MenuItem
                  key={option.id}
                  selected={selected}
                  onClick={() => handleRoleChange(option.id)}
                  sx={{ ...itemSx, '&.Mui-selected': { bgcolor: colors.brandSoft, '&:hover': { bgcolor: colors.brandTint } } }}
                >
                  <Box
                    aria-hidden="true"
                    sx={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      flexShrink: 0,
                      display: 'grid',
                      placeItems: 'center',
                      border: `2px solid ${selected ? colors.brand : colors.border}`,
                      bgcolor: selected ? colors.brand : 'transparent',
                      color: '#FFFFFF',
                    }}
                  >
                    {selected ? <Check size={11} strokeWidth={3} /> : null}
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: selected ? 650 : 500, lineHeight: 1.3 }}>
                      {option.name}
                    </Typography>
                    {option.description ? (
                      <Typography variant="caption" component="p" noWrap sx={{ lineHeight: 1.3 }}>
                        {option.description}
                      </Typography>
                    ) : null}
                  </Box>
                </MenuItem>
              )
            })}
            <Divider sx={{ my: 0.75 }} />
          </Box>
        ) : null}

        <MenuItem
          onClick={() => {
            setProfileAnchor(null)
            setPasswordOpen(true)
          }}
          sx={itemSx}
        >
          <Box sx={{ display: 'inline-flex', color: colors.textSecondary }}>
            <KeyRound size={16} strokeWidth={1.75} aria-hidden="true" />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Change password
          </Typography>
        </MenuItem>

        <MenuItem
          onClick={async () => {
            setProfileAnchor(null)
            await logout()
            navigate(ROUTES.login, { replace: true })
          }}
          sx={{ ...itemSx, color: STATUS_TONES.rose.strong, '&:hover': { bgcolor: STATUS_TONES.rose.soft } }}
        >
          <Box sx={{ display: 'inline-flex' }}>
            <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'inherit' }}>
            Sign out
          </Typography>
        </MenuItem>
      </Menu>

      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </Box>
  )
}
