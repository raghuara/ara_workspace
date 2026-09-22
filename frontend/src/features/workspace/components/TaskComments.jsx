import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputBase,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { MessageSquare, MoreHorizontal, Pencil, SendHorizontal, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LinkifiedText } from '@/components/LinkifiedText'
import { UserAvatar } from '@/components/UserAvatar'
import { taskService } from '@/api/taskService'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { colors } from '@/theme/tokens'
import { formatDateTime, formatTimeAgo } from '@/utils/date'

const COMMENT_MAX = 4000
const ROLE_TONES = { 1: 'blue', 2: 'violet', 3: 'slate', 4: 'teal' }

const isSendKey = (event) => event.key === 'Enter' && (event.ctrlKey || event.metaKey)

const RoleChip = ({ typeId, name }) => {
  const tone = STATUS_TONES[ROLE_TONES[typeId] ?? 'gray']
  return (
    <Box
      component="span"
      sx={{
        px: 0.75,
        py: '1px',
        borderRadius: 999,
        bgcolor: tone.soft,
        border: `1px solid ${tone.border}`,
        color: tone.strong,
        fontSize: '0.625rem',
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {name}
    </Box>
  )
}

const CommentItem = ({ comment, own, canDelete, onUpdated, onDeleted }) => {
  const [anchor, setAnchor] = useState(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)

  const startEdit = () => {
    setAnchor(null)
    setDraft(comment.body)
    setError('')
    setEditing(true)
  }

  const saveEdit = async () => {
    const body = draft.trim()
    if (!body) return
    if (body === comment.body) {
      setEditing(false)
      return
    }
    setBusy(true)
    setError('')
    try {
      onUpdated(await taskService.updateComment(comment.id, body))
      setEditing(false)
    } catch (caught) {
      setError(caught.message ?? 'The comment could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    setError('')
    try {
      await taskService.deleteComment(comment.id)
      setConfirming(false)
      onDeleted(comment.id)
    } catch (caught) {
      setConfirming(false)
      setError(caught.message ?? 'The comment could not be deleted.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box component="li" sx={{ display: 'flex', gap: 1.25, listStyle: 'none' }}>
      <Box sx={{ pt: 0.25 }}>
        <UserAvatar name={comment.authorName} size={30} />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={0.75} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', minHeight: 26 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {comment.authorName}
            {own ? (
              <Box component="span" sx={{ fontWeight: 500, color: colors.textSecondary }}>
                {' '}
                (you)
              </Box>
            ) : null}
          </Typography>
          {comment.authorTypeName ? <RoleChip typeId={comment.authorTypeId} name={comment.authorTypeName} /> : null}
          <Tooltip title={formatDateTime(comment.createdAt)}>
            <Typography variant="caption" sx={{ color: colors.textSecondary }}>
              {formatTimeAgo(comment.createdAt)}
            </Typography>
          </Tooltip>
          {comment.editedAt ? (
            <Tooltip title={`Edited ${formatDateTime(comment.editedAt)}`}>
              <Typography variant="caption" sx={{ color: colors.textSecondary, fontStyle: 'italic' }}>
                · edited
              </Typography>
            </Tooltip>
          ) : null}
          <Box sx={{ flex: 1 }} />
          {(own || canDelete) && !editing ? (
            <IconButton
              size="small"
              aria-label="Comment options"
              aria-haspopup="menu"
              onClick={(event) => setAnchor(event.currentTarget)}
              sx={{ p: 0.375, color: colors.textSecondary }}
            >
              <MoreHorizontal size={15} strokeWidth={2} />
            </IconButton>
          ) : null}
        </Stack>

        {editing ? (
          <Box sx={{ mt: 0.5 }}>
            <TextField
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (isSendKey(event)) {
                  event.preventDefault()
                  saveEdit()
                }
                if (event.key === 'Escape') {
                  event.preventDefault()
                  event.stopPropagation()
                  setEditing(false)
                }
              }}
              multiline
              minRows={2}
              maxRows={10}
              fullWidth
              autoFocus
              disabled={busy}
              slotProps={{ htmlInput: { 'aria-label': 'Edit comment', maxLength: COMMENT_MAX } }}
            />
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', mt: 0.75 }}>
              <Button size="small" variant="outlined" onClick={() => setEditing(false)} disabled={busy}>
                Cancel
              </Button>
              <Button size="small" variant="contained" onClick={saveEdit} disabled={busy || !draft.trim()}>
                {busy ? 'Saving…' : 'Save'}
              </Button>
            </Stack>
          </Box>
        ) : (
          <Box
            sx={{
              mt: 0.5,
              px: 1.25,
              py: 0.875,
              borderRadius: '4px 12px 12px 12px',
              bgcolor: own ? colors.brandSoft : colors.page,
              border: `1px solid ${own ? colors.brandTintStrong : colors.border}`,
            }}
          >
            <LinkifiedText text={comment.body} />
          </Box>
        )}

        {error ? (
          <Typography variant="caption" component="p" sx={{ mt: 0.5, color: colors.danger }}>
            {error}
          </Typography>
        ) : null}
      </Box>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 160, borderRadius: 2 } }, list: { sx: { py: 0.5 } } }}
      >
        {own ? (
          <MenuItem onClick={startEdit} sx={{ mx: 0.5, borderRadius: 1.5 }}>
            <ListItemIcon>
              <Pencil size={14} strokeWidth={2} />
            </ListItemIcon>
            <ListItemText primary="Edit" slotProps={{ primary: { sx: { fontSize: '0.8125rem' } } }} />
          </MenuItem>
        ) : null}
        <MenuItem
          onClick={() => {
            setAnchor(null)
            setConfirming(true)
          }}
          sx={{
            mx: 0.5,
            borderRadius: 1.5,
            color: STATUS_TONES.rose.strong,
            '&:hover': { bgcolor: STATUS_TONES.rose.soft },
          }}
        >
          <ListItemIcon sx={{ color: 'inherit' }}>
            <Trash2 size={14} strokeWidth={2} />
          </ListItemIcon>
          <ListItemText primary="Delete" slotProps={{ primary: { sx: { fontSize: '0.8125rem', color: 'inherit' } } }} />
        </MenuItem>
      </Menu>

      <ConfirmDialog
        open={confirming}
        title="Delete this comment?"
        description="It will be removed for everyone on this task. This cannot be undone."
        confirmLabel="Delete"
        confirming={busy}
        onConfirm={remove}
        onClose={() => setConfirming(false)}
      />
    </Box>
  )
}

export const CommentThread = ({ comments, loading, error, onRetry, currentUserId, isAdmin, onUpdated, onDeleted }) => {
  if (loading && !comments) {
    return (
      <Stack spacing={2}>
        {[0, 1].map((index) => (
          <Stack key={index} direction="row" spacing={1.25}>
            <Skeleton variant="circular" width={30} height={30} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width={160} height={18} />
              <Skeleton variant="rounded" height={44} sx={{ mt: 0.5, borderRadius: 2 }} />
            </Box>
          </Stack>
        ))}
      </Stack>
    )
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button size="small" color="inherit" onClick={onRetry}>
            Retry
          </Button>
        }
      >
        {error.message ?? 'Comments could not be loaded.'}
      </Alert>
    )
  }

  if (!comments || comments.length === 0) {
    return (
      <Stack spacing={0.5} sx={{ alignItems: 'center', textAlign: 'center', py: 3 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            display: 'grid',
            placeItems: 'center',
            borderRadius: '50%',
            bgcolor: colors.brandSoft,
            color: colors.brand,
            mb: 0.5,
          }}
        >
          <MessageSquare size={18} strokeWidth={1.75} aria-hidden="true" />
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          No comments yet
        </Typography>
        <Typography variant="caption" component="p" sx={{ maxWidth: 280, color: colors.textSecondary }}>
          Ask a question or share an update. Everyone on this task is notified.
        </Typography>
      </Stack>
    )
  }

  return (
    <Stack component="ol" spacing={2} sx={{ m: 0, p: 0 }}>
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          own={Boolean(currentUserId) && comment.authorId === currentUserId}
          canDelete={isAdmin}
          onUpdated={onUpdated}
          onDeleted={onDeleted}
        />
      ))}
    </Stack>
  )
}

export const CommentComposer = ({ onSend }) => {
  const [value, setValue] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const ready = value.trim().length > 0 && !sending

  const send = async () => {
    if (!ready) return
    setSending(true)
    setError('')
    try {
      await onSend(value.trim())
      setValue('')
    } catch (caught) {
      setError(caught.message ?? 'The comment could not be sent.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Box sx={{ px: 2, py: 1.5, borderTop: `1px solid ${colors.border}`, bgcolor: colors.surface }}>
      <Box
        sx={{
          border: `1px solid ${colors.border}`,
          borderRadius: 2,
          bgcolor: colors.surface,
          transition: 'border-color 140ms ease, box-shadow 140ms ease',
          '&:focus-within': { borderColor: colors.brand, boxShadow: `0 0 0 3px ${colors.brandSoft}` },
        }}
      >
        <InputBase
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (isSendKey(event)) {
              event.preventDefault()
              send()
            }
          }}
          placeholder="Write a comment…"
          multiline
          minRows={1}
          maxRows={6}
          fullWidth
          disabled={sending}
          slotProps={{ input: { 'aria-label': 'Write a comment', maxLength: COMMENT_MAX } }}
          sx={{ px: 1.5, pt: 1.125, pb: 0.5, fontSize: '0.8125rem', lineHeight: 1.5 }}
        />
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', px: 1, pb: 0.75 }}>
          <Typography
            variant="caption"
            sx={{ flex: 1, pl: 0.5, color: colors.textSecondary, display: { xs: 'none', sm: 'block' } }}
          >
            Ctrl + Enter to send
          </Typography>
          <Box sx={{ flex: { xs: 1, sm: 'none' } }} />
          <Button
            size="small"
            variant="contained"
            onClick={send}
            disabled={!ready}
            endIcon={<SendHorizontal size={14} strokeWidth={2} />}
          >
            {sending ? 'Sending…' : 'Send'}
          </Button>
        </Stack>
      </Box>
      {error ? (
        <Typography variant="caption" component="p" sx={{ mt: 0.75, color: colors.danger }}>
          {error}
        </Typography>
      ) : null}
    </Box>
  )
}
