import { useState } from 'react'
import { Alert, Box, Button, Stack, TextField, Tooltip, Typography } from '@mui/material'
import { AlignLeft, Pencil } from 'lucide-react'
import { LinkifiedText } from '@/components/LinkifiedText'
import { taskService } from '@/api/taskService'
import { useAsync } from '@/hooks/useAsync'
import { useSubmit } from '@/hooks/useSubmit'
import { colors } from '@/theme/tokens'
import { formatDateTime, formatTimeAgo } from '@/utils/date'

export const TaskDescription = ({ task, canEdit, onSaved }) => {
  const detail = useAsync(taskService.getTask, [task.id], { keepPrevious: false })
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const { submit, submitting, error, reset } = useSubmit((value) =>
    taskService.updateTask(task.id, { description: value }),
  )

  const current = detail.data ?? task
  const description = current.description ?? ''

  const start = () => {
    setDraft(description)
    reset()
    setEditing(true)
  }

  const cancel = () => {
    setEditing(false)
    reset()
  }

  const save = async () => {
    if (draft.trim() === description.trim()) {
      setEditing(false)
      return
    }
    const result = await submit(draft)
    if (result) {
      detail.setData(result)
      setEditing(false)
      onSaved?.(result)
    }
  }

  return (
    <Box component="section" aria-label="Description" sx={{ mb: 2 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75, minHeight: 28 }}>
        <Typography variant="subtitle2" component="h3" sx={{ flex: 1 }}>
          Description
        </Typography>
        {canEdit && !editing && description ? (
          <Button
            size="small"
            variant="text"
            onClick={start}
            startIcon={<Pencil size={13} strokeWidth={2} />}
            sx={{ color: colors.textSecondary, minHeight: 26 }}
          >
            Edit
          </Button>
        ) : null}
      </Stack>

      {editing ? (
        <Box>
          <TextField
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault()
                save()
              }
              if (event.key === 'Escape') {
                event.preventDefault()
                event.stopPropagation()
                cancel()
              }
            }}
            placeholder="What needs to be done? Add steps, links and references…"
            multiline
            minRows={4}
            maxRows={14}
            fullWidth
            autoFocus
            disabled={submitting}
            slotProps={{ htmlInput: { 'aria-label': 'Task description', maxLength: 5000 } }}
          />
          {error ? (
            <Alert severity="error" sx={{ mt: 1 }}>
              {error.message ?? 'The description could not be saved.'}
            </Alert>
          ) : null}
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 1 }}>
            <Typography
              variant="caption"
              sx={{ flex: 1, color: colors.textSecondary, display: { xs: 'none', sm: 'block' } }}
            >
              Ctrl + Enter to save · Esc to cancel
            </Typography>
            <Box sx={{ flex: { xs: 1, sm: 'none' } }} />
            <Button size="small" variant="outlined" onClick={cancel} disabled={submitting}>
              Cancel
            </Button>
            <Button size="small" variant="contained" onClick={save} disabled={submitting}>
              {submitting ? 'Saving…' : 'Save'}
            </Button>
          </Stack>
        </Box>
      ) : description ? (
        <Box>
          <Box
            sx={{
              px: 1.5,
              py: 1.25,
              borderRadius: 2,
              bgcolor: colors.page,
              border: `1px solid ${colors.border}`,
              maxHeight: 320,
              overflowY: 'auto',
            }}
          >
            <LinkifiedText text={description} />
          </Box>
          {current.descriptionUpdatedAt ? (
            <Tooltip title={formatDateTime(current.descriptionUpdatedAt)} placement="bottom-start">
              <Typography
                variant="caption"
                component="p"
                sx={{ mt: 0.625, color: colors.textSecondary, width: 'fit-content' }}
              >
                Last updated by {current.descriptionUpdatedByName ?? 'someone'} ·{' '}
                {formatTimeAgo(current.descriptionUpdatedAt)}
              </Typography>
            </Tooltip>
          ) : null}
        </Box>
      ) : canEdit ? (
        <Box
          component="button"
          type="button"
          onClick={start}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            width: '100%',
            px: 1.5,
            py: 1.5,
            border: `1px dashed ${colors.border}`,
            borderRadius: 2,
            bgcolor: 'transparent',
            color: colors.textSecondary,
            font: 'inherit',
            fontSize: '0.8125rem',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'border-color 140ms ease, background-color 140ms ease, color 140ms ease',
            '&:hover': { borderColor: colors.brand, bgcolor: colors.brandSoft, color: colors.brandDark },
            '&:focus-visible': { outline: 'none', boxShadow: `0 0 0 2px ${colors.surface}, 0 0 0 4px ${colors.brand}` },
          }}
        >
          <AlignLeft size={15} strokeWidth={1.75} aria-hidden="true" />
          Add a description — what needs to be done, links, references…
        </Box>
      ) : (
        <Typography variant="caption" component="p" sx={{ color: colors.textSecondary }}>
          No description yet. Ask questions in the comments below.
        </Typography>
      )}
    </Box>
  )
}
