import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material'
import { DefinitionList } from '@/components/DefinitionList'
import { ScoreBar } from '@/components/ScoreBar'
import { StatusChip } from '@/components/StatusChip'
import { RATING_CRITERIA } from '@/constants/domain'
import { formatDate } from '@/utils/date'

export const InterviewReviewDetailDialog = ({ review, onClose }) => (
  <Dialog open={Boolean(review)} onClose={onClose} maxWidth="sm" fullWidth>
    {review ? (
      <>
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600 }}>
          <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{review.candidateName}</span>
            <StatusChip status={review.recommendation} />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 400 }}>
            {review.position}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <DefinitionList
            columns={{ xs: 1, sm: 2, lg: 2 }}
            items={[
              { label: 'Reviewer', value: review.reviewerName },
              { label: 'Submitted', value: formatDate(review.submittedOn) },
            ]}
          />

          <Divider sx={{ my: 2.5 }} />

          <Typography variant="h4" sx={{ mb: 2 }}>
            Scorecard
          </Typography>
          <Stack spacing={2}>
            {RATING_CRITERIA.map((criterion) => (
              <ScoreBar
                key={criterion.key}
                label={criterion.label}
                score={review.ratings[criterion.key]}
              />
            ))}
          </Stack>

          <Divider sx={{ my: 2.5 }} />

          <Typography variant="h4" sx={{ mb: 1 }}>
            Notes
          </Typography>
          <Box sx={{ bgcolor: 'background.default', borderRadius: 2, p: 2 }}>
            <Typography variant="body2">{review.notes || 'No notes were recorded.'}</Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={onClose} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </>
    ) : null}
  </Dialog>
)
