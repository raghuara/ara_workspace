import { useState } from 'react'
import { Box, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from '@mui/material'
import { Check, ChevronsUpDown } from 'lucide-react'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { useWorkspace } from '@/hooks/useWorkspace'
import { colors } from '@/theme/tokens'

export const WorkspaceSwitcher = () => {
  const { workspaces, activeWorkspace, selectWorkspace } = useWorkspace()
  const [anchor, setAnchor] = useState(null)

  if (!activeWorkspace) return null
  const tone = STATUS_TONES[activeWorkspace.tone] ?? STATUS_TONES.blue
  const open = Boolean(anchor)

  return (
    <>
      <Box
        component="button"
        type="button"
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Workspace: ${activeWorkspace.name}. Switch workspace`}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          height: 40,
          minWidth: 0,
          maxWidth: { sm: 220, md: 280 },
          flexShrink: 0,
          border: `1px solid ${open ? colors.brand : colors.border}`,
          borderRadius: 2,
          bgcolor: open ? colors.brandSoft : colors.surface,
          cursor: 'pointer',
          pl: 0.75,
          pr: 1,
          textAlign: 'left',
          transition: 'background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease, transform 120ms ease',
          '&:hover': { bgcolor: open ? colors.brandSoft : colors.neutralSoft },
          '&:active': { transform: 'scale(0.985)' },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: `0 0 0 2px ${colors.surface}, 0 0 0 4px ${colors.brand}`,
          },
        }}
      >
        <Box
          aria-hidden="true"
          sx={{
            width: 26,
            height: 26,
            borderRadius: 1.5,
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            bgcolor: tone.soft,
            color: tone.strong,
            fontSize: '0.625rem',
            fontWeight: 700,
            letterSpacing: '0.02em',
          }}
        >
          {activeWorkspace.shortName}
        </Box>
        <Box sx={{ minWidth: 0, display: { xs: 'none', sm: 'block' } }}>
          <Typography variant="body2" fontWeight={600} noWrap sx={{ lineHeight: 1.25 }}>
            {activeWorkspace.name}
          </Typography>
          <Typography variant="caption" component="p" noWrap sx={{ lineHeight: 1.25 }}>
            {activeWorkspace.openTaskCount} open tasks
          </Typography>
        </Box>
        <ChevronsUpDown
          size={14}
          strokeWidth={1.75}
          color={colors.textSecondary}
          aria-hidden="true"
          style={{ flexShrink: 0 }}
        />
      </Box>

      <Menu
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { width: 280, maxWidth: 'calc(100vw - 32px)', mt: 0.5 } } }}
      >
        <Typography variant="subtitle2" component="p" sx={{ px: 2, pt: 1.25, pb: 0.5 }}>
          Switch workspace
        </Typography>
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
              sx={{ py: 1 }}
            >
              <ListItemIcon>
                {selected ? (
                  <Check size={16} strokeWidth={2} color={colors.brand} aria-hidden="true" />
                ) : (
                  <Box sx={{ width: 16 }} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={workspace.name}
                secondary={`${workspace.groupCount} groups · ${workspace.memberCount} members`}
                slotProps={{
                  primary: { fontSize: '0.8125rem', fontWeight: selected ? 600 : 500 },
                  secondary: { fontSize: '0.75rem' },
                }}
              />
            </MenuItem>
          )
        })}
      </Menu>
    </>
  )
}
