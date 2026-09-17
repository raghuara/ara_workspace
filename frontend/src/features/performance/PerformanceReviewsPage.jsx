import { useMemo, useState } from 'react'
import {
  Box,
  Button,
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
import { Plus, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SearchField } from '@/components/SearchField'
import { StatusChip } from '@/components/StatusChip'
import { UserAvatar } from '@/components/UserAvatar'
import { EmptyState } from '@/components/EmptyState'
import { QueryStateView } from '@/components/QueryStateView'
import { TableSkeleton } from '@/components/TableSkeleton'
import { performanceService } from '@/api/performanceService'
import { departmentService } from '@/api/catalogService'
import { PERFORMANCE_STATUS } from '@/constants/domain'
import { PERMISSIONS } from '@/constants/permissions'
import { useAsync } from '@/hooks/useAsync'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePermissions } from '@/hooks/usePermissions'
import { useWorkspace } from '@/hooks/useWorkspace'
import { formatDate } from '@/utils/date'
import { pluralize } from '@/utils/format'
import { PerformanceReviewDetailDialog } from './PerformanceReviewDetailDialog'
import { ReviewFormDialog } from './ReviewFormDialog'

export const PerformanceReviewsPage = () => {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [department, setDepartment] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [selectedReview, setSelectedReview] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const { can } = usePermissions()
  const canEdit = can(PERMISSIONS.REVIEW_UPDATE)
  const { activeWorkspaceId } = useWorkspace()
  const { data: departments } = useAsync(departmentService.list, [{ workspaceId: activeWorkspaceId }], {
    enabled: Boolean(activeWorkspaceId),
  })

  const debouncedSearch = useDebouncedValue(search, 300)

  const applyFilter = (setter) => (value) => {
    setter(value)
    setPage(0)
  }

  const query = useMemo(
    () => ({ search: debouncedSearch, status, department, page: page + 1, pageSize }),
    [debouncedSearch, status, department, page, pageSize],
  )

  const { data, loading, error, reload } = useAsync(performanceService.listReviews, [query])

  return (
    <Box>
      <PageHeader
        title="Performance"
        description="Review cycles, ratings and goal progress across the organisation."
        breadcrumbs={[{ label: 'Performance' }]}
        actions={
          canEdit ? (
            <Button
              variant="contained"
              startIcon={<Plus size={16} strokeWidth={2} aria-hidden="true" />}
              onClick={() => setFormOpen(true)}
            >
              New review
            </Button>
          ) : null
        }
      />

      <ReviewFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false)
          reload()
        }}
      />

      <Card>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          sx={{ alignItems: { xs: 'stretch', md: 'center' }, p: 2 }}
        >
          <SearchField
            value={search}
            onChange={applyFilter(setSearch)}
            label="Search reviews"
            placeholder="Search employee, reviewer…"
          />
          <TextField
            select
            size="small"
            label="Status"
            value={status}
            onChange={(event) => applyFilter(setStatus)(event.target.value)}
            sx={{ minWidth: { md: 180 } }}
          >
            <MenuItem value="">All statuses</MenuItem>
            {Object.values(PERFORMANCE_STATUS).map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Department"
            value={department}
            onChange={(event) => applyFilter(setDepartment)(event.target.value)}
            sx={{ minWidth: { md: 180 } }}
          >
            <MenuItem value="">All departments</MenuItem>
            {(departments ?? []).map((option) => (
              <MenuItem key={option.id} value={option.name}>
                {option.name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <Divider />

        <QueryStateView error={error} onRetry={reload}>
          <TableContainer>
            <Table sx={{ minWidth: 960 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Review period</TableCell>
                  <TableCell>Reviewer</TableCell>
                  <TableCell>Overall rating</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last updated</TableCell>
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
                      aria-label={`Open review for ${review.employeeName}`}
                    >
                      <TableCell>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                          <UserAvatar name={review.employeeName} size={34} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={600} noWrap>
                              {review.employeeName}
                            </Typography>
                            <Typography variant="caption" component="p" noWrap>
                              {review.designation}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>{review.reviewPeriod}</TableCell>
                      <TableCell>{review.reviewerName}</TableCell>
                      <TableCell>
                        {review.overallRating === null ? (
                          <Typography variant="body2" color="text.secondary">
                            Not rated
                          </Typography>
                        ) : (
                          <Typography variant="body2" fontWeight={600}>
                            {review.overallRating.toFixed(1)}
                            <Typography component="span" variant="caption">
                              {' '}
                              / 5
                            </Typography>
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusChip status={review.status} />
                      </TableCell>
                      <TableCell>{formatDate(review.updatedOn)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              )}
            </Table>
          </TableContainer>

          {!loading && data?.items?.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No reviews found"
              description="No performance reviews match the current filters."
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

      {selectedReview ? (
        <PerformanceReviewDetailDialog
          review={selectedReview}
          onClose={() => setSelectedReview(null)}
          onSaved={(updated) => {
            reload()
            if (updated) setSelectedReview(updated)
            else setSelectedReview(null)
          }}
        />
      ) : null}
    </Box>
  )
}
