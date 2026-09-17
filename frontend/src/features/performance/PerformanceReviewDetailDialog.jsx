import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Pencil, Trash2 } from 'lucide-react'
import { DefinitionList } from '@/components/DefinitionList'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ReviewFormDialog } from './ReviewFormDialog'
import { StatusChip } from '@/components/StatusChip'
import { performanceService } from '@/api/performanceService'
import { isForbidden } from '@/api/httpClient'
import { PERMISSIONS } from '@/constants/permissions'
import { usePermissions } from '@/hooks/usePermissions'
import { useSubmit } from '@/hooks/useSubmit'
import { colors } from '@/theme/tokens'
import { formatDate } from '@/utils/date'

const BulletList = ({ items }) => (
  <Stack component="ul" spacing={0.75} sx={{ m: 0, pl: 2.5 }}>
    {items.map((item) => (
      <Typography component="li" variant="body2" key={item}>
        {item}
      </Typography>
    ))}
  </Stack>
)

export const PerformanceReviewDetailDialog = ({ review, onClose, onSaved }) => {
  const { can } = usePermissions()
  const canEdit = can(PERMISSIONS.REVIEW_UPDATE)

  const [managerComments, setManagerComments] = useState(review.managerComments ?? '')
  const [employeeComments, setEmployeeComments] = useState(review.employeeComments ?? '')
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError('')
    try {
      await performanceService.deleteReview(review.id)
      setConfirmDelete(false)
      onSaved?.(null)
    } catch (caught) {
      setDeleteError(caught.message ?? 'The review could not be deleted.')
    } finally {
      setDeleting(false)
    }
  }

  const { submit, submitting, error, succeeded, reset } = useSubmit((payload) =>
    performanceService.saveReview(review.id, payload),
  )

  const handleSave = async () => {
    const saved = await submit({ managerComments, employeeComments })
    if (saved) onSaved?.(saved)
  }

  const isDirty =
    managerComments !== (review.managerComments ?? '') || employeeComments !== (review.employeeComments ?? '')

  return (
    <Dialog open onClose={submitting ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600 }}>
        <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{review.employeeName}</span>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <StatusChip status={review.status} />
            {canEdit ? (
              <>
                <IconButton size="small" aria-label="Edit review" onClick={() => setEditing(true)}>
                  <Pencil size={16} strokeWidth={1.75} />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label="Delete review"
                  onClick={() => setConfirmDelete(true)}
                  sx={{ color: colors.danger }}
                >
                  <Trash2 size={16} strokeWidth={1.75} />
                </IconButton>
              </>
            ) : null}
          </Stack>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 400 }}>
          {review.designation} · {review.department}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {isForbidden(error)
              ? 'You do not have permission to update this review.'
              : (error.message ?? 'The review could not be saved.')}
          </Alert>
        ) : null}
        {succeeded ? (
          <Alert severity="success" sx={{ mb: 2 }} onClose={reset}>
            Review updated.
          </Alert>
        ) : null}

        <DefinitionList
          columns={{ xs: 1, sm: 2, lg: 4 }}
          items={[
            { label: 'Review period', value: review.reviewPeriod },
            { label: 'Reviewer', value: review.reviewerName },
            {
              label: 'Overall rating',
              value: review.overallRating === null ? 'Not rated' : `${review.overallRating.toFixed(1)} / 5`,
            },
            { label: 'Last updated', value: formatDate(review.updatedOn) },
          ]}
        />

        <Divider sx={{ my: 2.5 }} />

        <Typography variant="h4" sx={{ mb: 1.5 }}>
          Goals
        </Typography>
        <Stack spacing={2}>
          {review.goals.map((goal) => (
            <Box key={goal.id}>
              <Stack
                direction="row"
                spacing={2}
                sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}
              >
                <Typography variant="body2">{goal.title}</Typography>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
                  <Chip
                    label={goal.status}
                    size="small"
                    sx={{ bgcolor: colors.neutralSoft, color: colors.textSecondary }}
                  />
                  <Typography variant="body2" fontWeight={600}>
                    {goal.progress}%
                  </Typography>
                </Stack>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={goal.progress}
                aria-label={`${goal.title}: ${goal.progress}% complete`}
                sx={{ height: 5 }}
              />
            </Box>
          ))}
        </Stack>

        <Divider sx={{ my: 2.5 }} />

        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
          <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>
              Strengths
            </Typography>
            <BulletList items={review.strengths} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>
              Improvement areas
            </Typography>
            <BulletList items={review.improvementAreas} />
          </Box>
        </Box>

        <Divider sx={{ my: 2.5 }} />

        <Stack spacing={2}>
          <TextField
            label="Manager comments"
            value={managerComments}
            onChange={(event) => setManagerComments(event.target.value)}
            size="small"
            fullWidth
            multiline
            minRows={3}
            disabled={!canEdit || submitting}
          />
          <TextField
            label="Employee comments"
            value={employeeComments}
            onChange={(event) => setEmployeeComments(event.target.value)}
            size="small"
            fullWidth
            multiline
            minRows={3}
            disabled={!canEdit || submitting}
            placeholder={canEdit ? 'Add the employee’s response' : 'No response recorded'}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} variant="outlined" disabled={submitting}>
          Close
        </Button>
        {canEdit ? (
          <Button onClick={handleSave} variant="contained" disabled={submitting || !isDirty}>
            {submitting ? 'Saving…' : 'Save comments'}
          </Button>
        ) : null}
      </DialogActions>

      <ReviewFormDialog
        open={editing}
        review={review}
        onClose={() => setEditing(false)}
        onSaved={(updated) => {
          setEditing(false)
          onSaved?.(updated)
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete review?"
        description={`The ${review.reviewPeriod} review for ${review.employeeName} will be permanently removed.`}
        confirmLabel="Delete"
        confirming={deleting}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(false)}
      >
        {deleteError ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {deleteError}
          </Alert>
        ) : null}
      </ConfirmDialog>
    </Dialog>
  )
}
