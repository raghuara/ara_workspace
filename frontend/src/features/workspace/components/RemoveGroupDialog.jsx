import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material'
import { Trash2 } from 'lucide-react'
import { StatusChip } from '@/components/StatusChip'
import { workspaceService } from '@/api/workspaceService'
import { isForbidden } from '@/api/httpClient'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { useSubmit } from '@/hooks/useSubmit'
import { useWorkspace } from '@/hooks/useWorkspace'
import { colors } from '@/theme/tokens'

const danger = STATUS_TONES.rose

export const RemoveGroupDialog = ({ column, onClose, onRemoved }) => {
  const { activeWorkspace } = useWorkspace()
  const { submit, submitting, error } = useSubmit(workspaceService.deleteColumn)

  const confirm = async () => {
    const removed = await submit(column.id)
    if (removed) {
      onRemoved?.(column)
      onClose()
    }
  }

  return (
    <Dialog open onClose={submitting ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.25, fontSize: '1rem', fontWeight: 600 }}>
        <Box
          sx={{
            display: 'grid',
            placeItems: 'center',
            width: 34,
            height: 34,
            flexShrink: 0,
            borderRadius: 2,
            bgcolor: danger.soft,
            color: danger.strong,
          }}
        >
          <Trash2 size={17} strokeWidth={2} />
        </Box>
        Remove this group?
      </DialogTitle>

      <DialogContent>
        <Stack spacing={1.5}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.25,
              py: 1,
              borderRadius: 2,
              border: `1px solid ${colors.border}`,
              bgcolor: colors.page,
            }}
          >
            <StatusChip label={column.name} tone={column.tone} />
            <Box sx={{ flex: 1 }} />
            <Typography variant="caption" sx={{ color: colors.textSecondary }}>
              Empty
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ color: colors.textSecondary }}>
            It disappears from Board, List and Table for everyone in {activeWorkspace?.name ?? 'this workspace'}. No
            tasks are touched, and you can bring it back any time with <strong>Add group</strong>.
          </Typography>

          {error ? (
            <Alert severity="error">
              {isForbidden(error)
                ? 'You do not have permission to change the groups on this board.'
                : (error.message ?? 'The group could not be removed.')}
            </Alert>
          ) : null}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={submitting} variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={confirm}
          disabled={submitting}
          variant="contained"
          color="error"
          startIcon={<Trash2 size={15} strokeWidth={2} />}
        >
          {submitting ? 'Removing…' : 'Remove group'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
