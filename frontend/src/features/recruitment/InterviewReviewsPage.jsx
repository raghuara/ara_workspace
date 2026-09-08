import { useMemo, useState } from 'react'
import {
  Box,
  Card,
  Divider,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { ClipboardList } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SearchField } from '@/components/SearchField'
import { StatusChip } from '@/components/StatusChip'
import { UserAvatar } from '@/components/UserAvatar'
import { EmptyState } from '@/components/EmptyState'
import { QueryStateView } from '@/components/QueryStateView'
import { TableSkeleton } from '@/components/TableSkeleton'
import { recruitmentService } from '@/api/recruitmentService'
import { RATING_CRITERIA, RECOMMENDATIONS } from '@/constants/domain'
import { ROUTES } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatDate } from '@/utils/date'
import { pluralize } from '@/utils/format'
import { InterviewReviewDetailDialog } from './InterviewReviewDetailDialog'

const averageScore = (ratings) => {
  const values = RATING_CRITERIA.map((criterion) => ratings[criterion.key])
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export const InterviewReviewsPage = () => {
  const [search, setSearch] = useState('')
  const [recommendation, setRecommendation] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [selectedReview, setSelectedReview] = useState(null)

  const debouncedSearch = useDebouncedValue(search, 300)

  const applyFilter = (setter) => (value) => {
    setter(value)
    setPage(0)
  }

  const query = useMemo(
    () => ({ search: debouncedSearch, recommendation, page: page + 1, pageSize }),
    [debouncedSearch, recommendation, page, pageSize],
  )

  const { data, loading, error, reload } = useAsync(
    recruitmentService.listInterviewReviews,
    [query],
  )

  return (
    <Box>
      <PageHeader
        title="Interview Reviews"
        description="Structured scorecards submitted by interviewers after each round."
        breadcrumbs={[{ label: 'Recruitment', to: ROUTES.interviewSchedule }, { label: 'Interview Reviews' }]}
      />

      <Card>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'stretch', md: 'center' }}
          sx={{ p: 2.5 }}
        >
          <SearchField
            value={search}
            onChange={applyFilter(setSearch)}
            label="Search reviews"
            placeholder="Search candidate, reviewer…"
          />
          <TextField
            select
            size="small"
            label="Recommendation"
            value={recommendation}
            onChange={(event) => applyFilter(setRecommendation)(event.target.value)}
            sx={{ minWidth: { md: 200 } }}
          >
            <MenuItem value="">All recommendations</MenuItem>
            {Object.values(RECOMMENDATIONS).map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <Divider />

        <QueryStateView error={error} onRetry={reload}>
          <TableContainer>
            <Table sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Candidate</TableCell>
                  <TableCell>Position</TableCell>
                  <TableCell>Reviewer</TableCell>
                  <TableCell>Average score</TableCell>
                  <TableCell>Recommendation</TableCell>
                  <TableCell>Submitted</TableCell>
                </TableRow>
              </TableHead>

              {loading ? (
                <TableSkeleton rows={pageSize > 10 ? 10 : pageSize} columns={6} />
              ) : (
                <TableBody>
                  {data?.items?.map((review) => (
                    <TableRow
                      key={review.id}
                      hover
                      tabIndex={0}
                      onClick={() => setSelectedReview(review)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setSelectedReview(review)
                        }
                      }}
                      sx={{ cursor: 'pointer' }}
                      aria-label={`Open review for ${review.candidateName}`}
                    >
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <UserAvatar name={review.candidateName} size={34} />
                          <Typography variant="body2" fontWeight={600}>
                            {review.candidateName}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{review.position}</TableCell>
                      <TableCell>{review.reviewerName}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {averageScore(review.ratings).toFixed(1)}
                          <Typography component="span" variant="caption">
                            {' '}
                            / 5
                          </Typography>
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <StatusChip status={review.recommendation} />
                      </TableCell>
                      <TableCell>{formatDate(review.submittedOn)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              )}
            </Table>
          </TableContainer>

          {!loading && data?.items?.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No interview reviews"
              description="Scorecards appear here once interviewers submit their feedback."
            />
          ) : null}

          {data?.total ? (
            <>
              <Divider />
              <TablePagination
                component="div"
                count={data.total}
                page={page}
                onPageChange={(_, nextPage) => setPage(nextPage)}
                rowsPerPage={pageSize}
                onRowsPerPageChange={(event) => {
                  setPageSize(Number(event.target.value))
                  setPage(0)
                }}
                rowsPerPageOptions={[10, 25, 50]}
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} of ${pluralize(count, 'review')}`}
              />
            </>
          ) : null}
        </QueryStateView>
      </Card>

      <InterviewReviewDetailDialog review={selectedReview} onClose={() => setSelectedReview(null)} />
    </Box>
  )
}
