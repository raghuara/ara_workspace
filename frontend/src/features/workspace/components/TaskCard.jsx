import { useState } from 'react'
import { Box, Divider, IconButton, InputBase, ListItemIcon, ListItemText, Menu, MenuItem, Stack, Tooltip, Typography } from '@mui/material'
import { keyframes } from '@mui/material/styles'
import {
  ArrowRightLeft,
  Check,
  ChevronLeft,
  Copy,
  Ellipsis,
  Flag,
  MessageSquare,
  Paperclip,
  Pencil,
  Repeat,
  TextCursorInput,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ToneChip } from '@/components/ToneChip'
import { UserAvatar } from '@/components/UserAvatar'
import { PERMISSIONS } from '@/constants/permissions'
import { PRIORITY_TONES, STATUS_TONES } from '@/constants/workspaceDomain'
import { usePermissions } from '@/hooks/usePermissions'
import { colors } from '@/theme/tokens'
import { formatRelativeDay } from '@/utils/date'

const settle = keyframes`
  from { transform: translateY(-6px) scale(0.98); box-shadow: 0 12px 28px rgba(37, 99, 235, 0.24); border-color: ${colors.brand}; }
  to { transform: none; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04); }
`

const stop = (event) => event.stopPropagation()

const ActionButton = ({ title, icon: Icon, tone, onClick }) => (
  <Tooltip title={title}>
    <IconButton
      size="small"
      aria-label={title}
      onPointerDown={stop}
      onClick={(event) => {
        event.stopPropagation()
        onClick(event)
      }}
      sx={{
        width: 26,
        height: 26,
        borderRadius: 1,
        color: tone ? STATUS_TONES[tone].strong : colors.textSecondary,
        '&:hover': { bgcolor: tone ? STATUS_TONES[tone].soft : colors.neutralSoft, color: tone ? STATUS_TONES[tone].strong : colors.textPrimary },
      }}
    >
      <Icon size={14} strokeWidth={2} aria-hidden="true" />
    </IconButton>
  </Tooltip>
)

export const TaskCard = ({
  task,
  draggable = false,
  onOpen,
  onPointerDown,
  onAction,
  columns = [],
  isDragging,
  isSettling,
  lifted,
}) => {
  const { can } = usePermissions()
  const priorityTone = STATUS_TONES[PRIORITY_TONES[task.priority] ?? 'gray']

  const [menu, setMenu] = useState(null)
  const [menuView, setMenuView] = useState('main')
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(task.title)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const interactive = Boolean(onAction) && !lifted && !isDragging
  const completed = task.statusKind === 'completed'
  const canMove = can(PERMISSIONS.TASK_MOVE)
  const canUpdate = can(PERMISSIONS.TASK_UPDATE)
  const canCreate = can(PERMISSIONS.TASK_CREATE)
  const canDelete = can(PERMISSIONS.TASK_DELETE)
  const menuOpen = Boolean(menu)

  const closeMenu = () => {
    setMenu(null)
    setMenuView('main')
  }

  const startRename = () => {
    setDraft(task.title)
    setRenaming(true)
  }

  const commitRename = () => {
    setRenaming(false)
    const title = draft.trim()
    if (title && title !== task.title) onAction('rename', task, { title })
  }

  return (
    <Box
      role="button"
      tabIndex={0}
      data-task-id={task.id}
      onPointerDown={draggable ? (event) => onPointerDown?.(event, task) : undefined}
      onClick={() => {
        if (!renaming) onOpen?.(task)
      }}
      onKeyDown={(event) => {
        if (renaming) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen?.(task)
        }
      }}
      aria-label={`Open task ${task.title}`}
      sx={{
        position: 'relative',
        bgcolor: colors.surface,
        border: `1px solid ${task.isOverdue ? STATUS_TONES.rose.border : colors.border}`,
        borderRadius: 2,
        p: 1.25,
        cursor: draggable ? 'grab' : 'pointer',
        touchAction: draggable ? 'manipulation' : 'auto',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
        transition: 'border-color 120ms ease, box-shadow 120ms ease',
        '&:hover': { borderColor: colors.brand, boxShadow: '0 2px 6px rgba(15,23,42,0.08)' },
        '&:hover .card-actions, &:focus-within .card-actions': { opacity: 1, pointerEvents: 'auto' },
        ...(menuOpen && { borderColor: colors.brand, '& .card-actions': { opacity: 1, pointerEvents: 'auto' } }),
        ...(isSettling && { animation: `${settle} 320ms cubic-bezier(0.2, 0.8, 0.2, 1)` }),
        ...(lifted && {
          cursor: 'grabbing',
          borderColor: colors.brand,
          boxShadow: '0 18px 36px rgba(15,23,42,0.22), 0 2px 6px rgba(15,23,42,0.10)',
        }),
        ...(isDragging && {
          bgcolor: 'transparent',
          borderStyle: 'dashed',
          borderColor: colors.border,
          boxShadow: 'none',
          '& > *': { visibility: 'hidden' },
          '&:hover': { borderColor: colors.border, boxShadow: 'none' },
        }),
      }}
    >
      {interactive ? (
        <Stack
          direction="row"
          spacing={0.25}
          className="card-actions"
          onClick={stop}
          onPointerDown={stop}
          sx={{
            position: 'absolute',
            top: 6,
            right: 6,
            zIndex: 1,
            p: 0.25,
            bgcolor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 1.5,
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.10)',
            opacity: 0,
            pointerEvents: 'none',
            transition: 'opacity 120ms ease',
            '@media (hover: none)': { opacity: 1, pointerEvents: 'auto' },
          }}
        >
          {canMove && !completed ? (
            <ActionButton title="Mark complete" icon={Check} tone="green" onClick={() => onAction('complete', task)} />
          ) : null}
          {canUpdate ? <ActionButton title="Edit" icon={Pencil} onClick={() => onAction('edit', task)} /> : null}
          <ActionButton title="More" icon={Ellipsis} onClick={(event) => setMenu(event.currentTarget)} />
        </Stack>
      ) : null}

      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', mb: 0.75, pr: interactive ? 11 : 0 }} useFlexGap>
        <ToneChip label={task.clientName} tone={task.clientTone} />
        {task.points ? (
          <Tooltip title={`Size ${task.sizeKey} — ${task.points} points`}>
            <Box component="span" sx={{ display: 'inline-flex' }}>
              <ToneChip label={`${task.points} pts`} tone="teal" />
            </Box>
          </Tooltip>
        ) : null}
      </Stack>

      {renaming ? (
        <InputBase
          autoFocus
          fullWidth
          multiline
          value={draft}
          aria-label="Rename task"
          onChange={(event) => setDraft(event.target.value)}
          onFocus={(event) => event.target.select()}
          onBlur={commitRename}
          onClick={stop}
          onPointerDown={stop}
          onKeyDown={(event) => {
            event.stopPropagation()
            if (event.key === 'Enter') {
              event.preventDefault()
              commitRename()
            }
            if (event.key === 'Escape') {
              setDraft(task.title)
              setRenaming(false)
            }
          }}
          sx={{
            mb: 0.875,
            px: 0.75,
            py: 0.25,
            fontSize: '0.8125rem',
            fontWeight: 600,
            lineHeight: 1.4,
            borderRadius: 1,
            bgcolor: colors.brandSoft,
            boxShadow: `inset 0 0 0 1.5px ${colors.brand}`,
          }}
        />
      ) : (
        <Typography variant="body2" fontWeight={600} sx={{ mb: 0.875, lineHeight: 1.4 }}>
          {task.recurringId ? (
            <Tooltip title="Created automatically from a recurring task">
              <Box component="span" sx={{ display: 'inline-flex', verticalAlign: '-2px', mr: 0.5, color: colors.brand }}>
                <Repeat size={12} strokeWidth={2.25} aria-label="Recurring" />
              </Box>
            </Tooltip>
          ) : null}
          {task.title}
        </Typography>
      )}

      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Stack direction="row" spacing={-0.75} sx={{ mr: 0.25 }}>
          {task.assignees.slice(0, 3).map((assignee) => (
            <Tooltip key={assignee.id} title={assignee.fullName}>
              <Box sx={{ ml: -0.5, '&:first-of-type': { ml: 0 } }}>
                <UserAvatar name={assignee.fullName} size={22} />
              </Box>
            </Tooltip>
          ))}
          {task.assignees.length > 3 ? (
            <Box
              sx={{
                ml: -0.5,
                width: 22,
                height: 22,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                bgcolor: colors.neutralSoft,
                border: `1px solid ${colors.border}`,
                fontSize: '0.625rem',
                fontWeight: 600,
                color: colors.textSecondary,
              }}
            >
              +{task.assignees.length - 3}
            </Box>
          ) : null}
        </Stack>

        <Stack
          direction="row"
          spacing={0.375}
          sx={{ alignItems: 'center', color: task.isOverdue ? STATUS_TONES.rose.strong : colors.textSecondary }}
        >
          {task.isOverdue ? (
            <TriangleAlert size={12} strokeWidth={2} aria-hidden="true" />
          ) : null}
          <Typography variant="caption" sx={{ color: 'inherit', fontWeight: task.isOverdue ? 600 : 400 }}>
            {formatRelativeDay(task.dueDate)}
          </Typography>
        </Stack>

        <Box sx={{ flex: 1 }} />

        {task.attachmentCount > 0 ? (
          <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center', color: colors.textSecondary }}>
            <Paperclip size={12} strokeWidth={1.75} aria-hidden="true" />
            <Typography variant="caption">{task.attachmentCount}</Typography>
          </Stack>
        ) : null}
        {task.commentCount > 0 ? (
          <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center', color: colors.textSecondary }}>
            <MessageSquare size={12} strokeWidth={1.75} aria-hidden="true" />
            <Typography variant="caption">{task.commentCount}</Typography>
          </Stack>
        ) : null}

        <Tooltip title={`${task.priority} priority`}>
          <Box sx={{ display: 'inline-flex', color: priorityTone.strong }}>
            <Flag size={13} strokeWidth={2} aria-label={`${task.priority} priority`} />
          </Box>
        </Tooltip>
      </Stack>

      {interactive ? (
        <Box onClick={stop} onPointerDown={stop} onKeyDown={stop} sx={{ display: 'contents' }}>
          <Menu
            anchorEl={menu}
            open={menuOpen}
            onClose={closeMenu}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{ paper: { sx: { minWidth: 200 } } }}
          >
            {menuView === 'main'
              ? [
                  canUpdate ? (
                    <MenuItem
                      key="rename"
                      onClick={() => {
                        closeMenu()
                        startRename()
                      }}
                    >
                      <ListItemIcon>
                        <TextCursorInput size={15} strokeWidth={1.75} />
                      </ListItemIcon>
                      <ListItemText primary="Rename" slotProps={{ primary: { fontSize: '0.8125rem' } }} />
                    </MenuItem>
                  ) : null,
                  canCreate ? (
                    <MenuItem
                      key="duplicate"
                      onClick={() => {
                        closeMenu()
                        onAction('duplicate', task)
                      }}
                    >
                      <ListItemIcon>
                        <Copy size={15} strokeWidth={1.75} />
                      </ListItemIcon>
                      <ListItemText primary="Duplicate" slotProps={{ primary: { fontSize: '0.8125rem' } }} />
                    </MenuItem>
                  ) : null,
                  canMove && columns.length > 1 ? (
                    <MenuItem key="move" onClick={() => setMenuView('move')}>
                      <ListItemIcon>
                        <ArrowRightLeft size={15} strokeWidth={1.75} />
                      </ListItemIcon>
                      <ListItemText primary="Move to" slotProps={{ primary: { fontSize: '0.8125rem' } }} />
                      <Typography variant="caption" sx={{ ml: 2, color: colors.textSecondary }}>
                        ›
                      </Typography>
                    </MenuItem>
                  ) : null,
                  canDelete ? <Divider key="divider" /> : null,
                  canDelete ? (
                    <MenuItem
                      key="delete"
                      onClick={() => {
                        closeMenu()
                        setConfirmDelete(true)
                      }}
                      sx={{ color: STATUS_TONES.rose.strong }}
                    >
                      <ListItemIcon sx={{ color: 'inherit' }}>
                        <Trash2 size={15} strokeWidth={1.75} />
                      </ListItemIcon>
                      <ListItemText primary="Delete" slotProps={{ primary: { fontSize: '0.8125rem', fontWeight: 500 } }} />
                    </MenuItem>
                  ) : null,
                ]
              : [
                  <MenuItem key="back" onClick={() => setMenuView('main')} sx={{ color: colors.textSecondary }}>
                    <ListItemIcon sx={{ color: 'inherit' }}>
                      <ChevronLeft size={15} strokeWidth={2} />
                    </ListItemIcon>
                    <ListItemText primary="Move to" slotProps={{ primary: { fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' } }} />
                  </MenuItem>,
                  <Divider key="divider" />,
                  ...columns.map((column) => {
                    const tone = STATUS_TONES[column.tone] ?? STATUS_TONES.slate
                    const current = column.id === task.statusId
                    return (
                      <MenuItem
                        key={column.id}
                        disabled={current}
                        onClick={() => {
                          closeMenu()
                          onAction('move', task, { columnId: column.id })
                        }}
                      >
                        <ListItemIcon>
                          <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: tone.strong }} />
                        </ListItemIcon>
                        <ListItemText primary={column.name} slotProps={{ primary: { fontSize: '0.8125rem' } }} />
                        {current ? <Check size={14} strokeWidth={2} color={colors.brand} aria-hidden="true" /> : null}
                      </MenuItem>
                    )
                  }),
                ]}
          </Menu>

          <ConfirmDialog
            open={confirmDelete}
            title="Delete this task?"
            description={`"${task.title}" will be removed from the board. This cannot be undone.`}
            confirmLabel="Delete"
            onClose={() => setConfirmDelete(false)}
            onConfirm={() => {
              setConfirmDelete(false)
              onAction('delete', task)
            }}
          />
        </Box>
      ) : null}
    </Box>
  )
}
