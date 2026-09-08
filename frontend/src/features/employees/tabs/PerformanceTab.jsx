import { Box, LinearProgress, Stack, Typography } from '@mui/material'
import { TrendingUp } from 'lucide-react'
import { SectionCard } from '@/components/SectionCard'
import { EmptyState } from '@/components/EmptyState'
import { QueryStateView } from '@/components/QueryStateView'
import { StatusChip } from '@/components/StatusChip'
import { performanceService } from '@/api/performanceService'
import { PERMISSIONS } from '@/constants/permissions'
import { useAsync } from '@/hooks/useAsync'
import { usePermissions } from '@/hooks/usePermissions'
import { AccessRestricted } from '@/components/AccessRestricted'
import { colors } from '@/theme/tokens'
import { formatDate } from '@/utils/date'

export const PerformanceTab = ({ employeeId }) => {
  const { can } = usePermissions()
  const allowed = can(PERMISSIONS.REVIEW_VIEW)

  const { data, loading, error, reload } = useAsync(
    performanceService.getReviewsByEmployee,
    [employeeId],
    { enabled: allowed },
  )

  if (!allowed) {
    return (
      <AccessRestricted
        title="Performance is restricted"
        description="Your role does not include access to performance reviews."
        showBackAction={false}
      />
    )
  }

  return (
    <SectionCard title="Performance" description="Review history for this employee" padded={false}>
      <QueryStateView error={error} onRetry={reload}>
        {loading ? (
          <Box sx={{ p: 2.5 }}>
            <LinearProgress aria-label="Loading performance reviews" />
          </Box>
        ) : data?.length ? (
          data.map((review) => (
            <Box
              key={review.id}
              sx={{
                px: 2.5,
                py: 2,
                borderBottom: `1px solid ${colors.border}`,
                '&:last-of-type': { borderBottom: 0 },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {review.reviewPeriod}
                  </Typography>
                  <Typography variant="caption" component="p">
                    Reviewer {review.reviewerName} · Updated {formatDate(review.updatedOn)}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexShrink: 0 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {review.overallRating.toFixed(1)}
                    <Typography component="span" variant="caption">
                      {' '}
                      / 5
                    </Typography>
                  </Typography>
                  <StatusChip status={review.status} />
                </Stack>
              </Stack>
            </Box>
          ))
        ) : (
          <EmptyState
            icon={TrendingUp}
            title="No performance reviews"
            description="This employee has no completed or in-progress reviews yet."
          />
        )}
      </QueryStateView>
    </SectionCard>
  )
}
