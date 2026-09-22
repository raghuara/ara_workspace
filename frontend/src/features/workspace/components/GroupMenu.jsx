import { useState } from 'react'
import {
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material'
import { Lock, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import { STATUS_KINDS, STATUS_TONES } from '@/constants/workspaceDomain'
import { useWorkspace } from '@/hooks/useWorkspace'
import { colors } from '@/theme/tokens'

const REQUIRED = {
  [STATUS_KINDS.TODO]: 'New and recurring tasks start here, so the board always keeps one.',
  [STATUS_KINDS.COMPLETED]: 'Finished work and points are counted here, so the board always keeps one.',
}

const removalBlocker = (column, columns) => {
  if (column.taskCount > 0) {
    return {
      title: 'This group has tasks',
      detail: `Move its ${column.taskCount} task${column.taskCount === 1 ? '' : 's'} to another group first.`,
    }
  }
  const kind = columns.find((item) => item.id === column.id)?.kind ?? column.kind
  const hasTwin = columns.some((item) => item.id !== column.id && item.kind === kind)
  return REQUIRED[kind] && !hasTwin ? { title: 'Required group', detail: REQUIRED[kind] } : null
}

const danger = STATUS_TONES.rose
const itemText = { primary: { sx: { fontSize: '0.8125rem', fontWeight: 500, color: 'inherit' } } }

export const GroupMenu = ({ column, color, onAddTask, onRemove }) => {
  const { columns } = useWorkspace()
  const [anchor, setAnchor] = useState(null)
  const blocker = removalBlocker(column, columns)
  const close = () => setAnchor(null)

  const removeItem = (
    <MenuItem
      aria-disabled={blocker ? 'true' : undefined}
      onClick={() => {
        if (blocker) return
        close()
        onRemove(column)
      }}
      sx={{
        mx: 0.75,
        borderRadius: 1.5,
        color: blocker ? colors.textSecondary : danger.strong,
        cursor: blocker ? 'not-allowed' : 'pointer',
        '&:hover': { bgcolor: blocker ? colors.neutralSoft : danger.soft },
        '&.Mui-focusVisible': { bgcolor: blocker ? colors.neutralSoft : danger.soft },
      }}
    >
      <ListItemIcon sx={{ color: 'inherit', opacity: blocker ? 0.7 : 1 }}>
        <Trash2 size={15} strokeWidth={2} />
      </ListItemIcon>
      <ListItemText primary="Remove group" slotProps={itemText} />
      {blocker ? (
        <Box sx={{ display: 'inline-flex', ml: 1, color: colors.textSecondary }}>
          <Lock size={13} strokeWidth={2} aria-hidden="true" />
        </Box>
      ) : null}
    </MenuItem>
  )

  return (
    <>
      <Tooltip title="Group options">
        <IconButton
          size="small"
          aria-label={`${column.name} options`}
          aria-haspopup="menu"
          aria-expanded={Boolean(anchor)}
          onClick={(event) => {
            event.stopPropagation()
            setAnchor(event.currentTarget)
          }}
          sx={{ color: color ?? colors.textSecondary, bgcolor: anchor ? 'rgba(15, 23, 42, 0.06)' : 'transparent' }}
        >
          <MoreHorizontal size={16} strokeWidth={2} />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 208,
              maxWidth: 'calc(100vw - 24px)',
              mt: 0.75,
              borderRadius: 2.5,
              boxShadow: '0 16px 40px rgba(15, 23, 42, 0.14), 0 2px 6px rgba(15, 23, 42, 0.06)',
            },
          },
          list: { sx: { py: 0.75 } },
        }}
      >
        {onAddTask ? (
          <MenuItem
            onClick={() => {
              close()
              onAddTask(column)
            }}
            sx={{ mx: 0.75, borderRadius: 1.5 }}
          >
            <ListItemIcon>
              <Plus size={15} strokeWidth={2} />
            </ListItemIcon>
            <ListItemText primary="Add task" slotProps={itemText} />
          </MenuItem>
        ) : null}
        {onAddTask ? <Divider sx={{ my: 0.75 }} /> : null}
        {blocker ? (
          <Tooltip
            arrow
            placement="bottom"
            enterTouchDelay={0}
            leaveTouchDelay={4000}
            slotProps={{
              tooltip: { sx: { maxWidth: 232, px: 1.25, py: 1 } },
              arrow: { sx: { color: colors.textPrimary } },
            }}
            title={
              <>
                <Typography component="span" sx={{ display: 'block', fontSize: '0.75rem', fontWeight: 700 }}>
                  {blocker.title}
                </Typography>
                <Typography component="span" sx={{ display: 'block', fontSize: '0.75rem', opacity: 0.85, mt: 0.25 }}>
                  {blocker.detail}
                </Typography>
              </>
            }
          >
            {removeItem}
          </Tooltip>
        ) : (
          removeItem
        )}
      </Menu>
    </>
  )
}
