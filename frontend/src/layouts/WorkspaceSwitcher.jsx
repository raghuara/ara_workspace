import { useState } from 'react'
import { Box, Divider, Menu, MenuItem, Stack, Typography } from '@mui/material'
import { ArrowRight, Check, ChevronsUpDown, Settings2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PERMISSIONS } from '@/constants/permissions'
import { ROUTES } from '@/constants/routes'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { usePermissions } from '@/hooks/usePermissions'
import { useWorkspace } from '@/hooks/useWorkspace'
import { colors } from '@/theme/tokens'

const Badge = ({ workspace, size = 28 }) => {
  const tone = STATUS_TONES[workspace.tone] ?? STATUS_TONES.blue
  return (
    <Box
      aria-hidden="true"
      sx={{
        width: size,
        height: size,
        borderRadius: 1.5,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        bgcolor: tone.strong,
        color: '#FFFFFF',
        fontSize: size >= 32 ? '0.6875rem' : '0.625rem',
        fontWeight: 700,
        letterSpacing: '0.03em',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.14), 0 1px 2px rgba(15,23,42,0.12)',
      }}
    >
      {workspace.shortName}
    </Box>
  )
}

export const WorkspaceSwitcher = () => {
  const { workspaces, activeWorkspace, selectWorkspace } = useWorkspace()
  const { can } = usePermissions()
  const [anchor, setAnchor] = useState(null)

  if (!activeWorkspace) return null
  const open = Boolean(anchor)
  const single = workspaces.length <= 1 || !can(PERMISSIONS.WORKSPACE_CREATE)
  const canManage = can(PERMISSIONS.WORKSPACE_VIEW)

  return (
    <>
      <Box
        component="button"
        type="button"
        onClick={single ? undefined : (event) => setAnchor(event.currentTarget)}
        aria-haspopup={single ? undefined : 'menu'}
        aria-expanded={single ? undefined : open}
        aria-label={single ? `Workspace: ${activeWorkspace.name}` : `Workspace: ${activeWorkspace.name}. Switch workspace`}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          height: 40,
          minWidth: 0,
          maxWidth: { sm: 240, md: 300 },
          flexShrink: 0,
          border: 0,
          borderRadius: 2,
          bgcolor: open ? colors.brandSoft : 'transparent',
          cursor: single ? 'default' : 'pointer',
          pl: 0.75,
          pr: single ? 1.25 : 0.875,
          textAlign: 'left',
          font: 'inherit',
          transition: 'background-color 140ms ease, box-shadow 140ms ease, transform 120ms ease',
          '&:hover': { bgcolor: single ? 'transparent' : open ? colors.brandSoft : colors.neutralSoft },
          '&:active': { transform: single ? 'none' : 'scale(0.985)' },
          '&:focus-visible': { outline: 'none', boxShadow: `0 0 0 2px ${colors.surface}, 0 0 0 4px ${colors.brand}` },
        }}
      >
        <Badge workspace={activeWorkspace} />
        <Box sx={{ minWidth: 0, display: { xs: 'none', sm: 'block' } }}>
          <Typography variant="body2" fontWeight={600} noWrap sx={{ lineHeight: 1.25, color: colors.textPrimary }}>
            {activeWorkspace.name}
          </Typography>
          <Typography variant="caption" component="p" noWrap sx={{ lineHeight: 1.25 }}>
            {activeWorkspace.openTaskCount} open tasks
          </Typography>
        </Box>
        {single ? null : (
          <Box sx={{ display: 'inline-flex', color: colors.textSecondary, flexShrink: 0, ml: 0.25 }}>
            <ChevronsUpDown size={14} strokeWidth={1.75} aria-hidden="true" />
          </Box>
        )}
      </Box>

      <Menu
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              width: 300,
              maxWidth: 'calc(100vw - 24px)',
              mt: 1,
              borderRadius: 2.5,
              boxShadow: '0 16px 40px rgba(15, 23, 42, 0.14), 0 2px 6px rgba(15, 23, 42, 0.06)',
            },
          },
          list: { sx: { py: 0.75 } },
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', px: 2, pt: 0.75, pb: 0.75 }}>
          <Typography
            component="p"
            sx={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: colors.textSecondary }}
          >
            Workspaces
          </Typography>
          <Typography variant="caption">{workspaces.length}</Typography>
        </Stack>

        {workspaces.map((workspace) => {
          const selected = workspace.id === activeWorkspace.id
          return (
            <MenuItem
              key={workspace.id}
              selected={selected}
              onClick={() => {
                setAnchor(null)
                if (!selected) selectWorkspace(workspace.id)
              }}
              sx={{
                mx: 0.75,
                my: 0.125,
                px: 1.25,
                py: 0.875,
                borderRadius: 1.5,
                gap: 1.25,
                alignItems: 'center',
                '&.Mui-selected': { bgcolor: colors.brandSoft, '&:hover': { bgcolor: colors.brandTint } },
              }}
            >
              <Badge workspace={workspace} size={32} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: selected ? 650 : 500, lineHeight: 1.3 }}>
                  {workspace.name}
                </Typography>
                <Typography variant="caption" component="p" noWrap sx={{ lineHeight: 1.3 }}>
                  {workspace.groupCount} groups · {workspace.memberCount} members
                </Typography>
              </Box>
              {selected ? (
                <Box sx={{ display: 'inline-flex', color: colors.brand, flexShrink: 0 }}>
                  <Check size={16} strokeWidth={2.25} aria-hidden="true" />
                </Box>
              ) : null}
            </MenuItem>
          )
        })}

        {canManage ? (
          <Box>
            <Divider sx={{ my: 0.75 }} />
            <MenuItem
              component={Link}
              to={ROUTES.adminWorkspaces}
              onClick={() => setAnchor(null)}
              sx={{ mx: 0.75, px: 1.25, py: 0.875, borderRadius: 1.5, gap: 1.25, color: colors.textSecondary }}
            >
              <Box sx={{ width: 32, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <Settings2 size={16} strokeWidth={1.75} aria-hidden="true" />
              </Box>
              <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
                Manage workspaces
              </Typography>
              <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
            </MenuItem>
          </Box>
        ) : null}
      </Menu>
    </>
  )
}
