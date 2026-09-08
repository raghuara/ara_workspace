import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Card,
  Divider,
  IconButton,
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
  Tooltip,
  Typography,
} from '@mui/material'
import { CalendarDays, Pencil, Plus } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SearchField } from '@/components/SearchField'
import { StatusChip } from '@/components/StatusChip'
import { UserAvatar } from '@/components/UserAvatar'
import { EmptyState } from '@/components/EmptyState'
import { QueryStateView } from '@/components/QueryStateView'
import { TableSkeleton } from '@/components/TableSkeleton'
import { recruitmentService } from '@/api/recruitmentService'
import { INTERVIEW_STATUS, INTERVIEW_TYPES } from '@/constants/domain'
import { PERMISSIONS } from '@/constants/permissions'
import { ROUTES } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePermissions } from '@/hooks/usePermissions'
import { formatDate, formatRelativeDay, formatTime } from '@/utils/date'
import { pluralize } from '@/utils/format'
import { InterviewFormDialog } from './InterviewFormDialog'

export const InterviewSchedulePage = () => {
  const { can } = usePermissions()
  const canManage = can(PERMISSIONS.INTERVIEW_UPDATE)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [dialogState, setDialogState] = useState({ open: false, interview: null })

  const debouncedSearch = useDebouncedValue(search, 300)

  const applyFilter = (setter) => (value) => {
    setter(value)
    setPage(0)
  }

  const query = useMemo(
    () => ({ search: debouncedSearch, status, type, page: page + 1, pageSize }),
    [debouncedSearch, status, type, page, pageSize],
  )

  const { data, loading, error, reload } = useAsync(recruitmentService.listInterviews, [query])

  const hasFilters = Boolean(search || status || type)

  return (
    <Box>
      <PageHeader
        title="Interview Schedule"
        description="Plan and track every interview across the hiring pipeline."
        breadcrumbs={[{ label: 'Recruitment', to: ROUTES.interviewSchedule }, { label: 'Interview Schedule' }]}
        actions={
          canManage ? (
            <Button
              variant="contained"
              startIcon={<Plus size={16} strokeWidth={2} />}
              onClick={() => setDialogState({ open: true, interview: null })}
            >
              Schedule interview
            </Button>
          ) : null
        }
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
            label="Search interviews"
            placeholder="Search candidate, position…"
          />
          <TextField
            select
            size="small"
            label="Status"
            value={status}
            onChange={(event) => applyFilter(setStatus)(event.target.value)}
            sx={{ minWidth: { md: 170 } }}
          >
            <MenuItem value="">All statuses</MenuItem>
            {Object.values(INTERVIEW_STATUS).map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Type"
            value={type}
            onChange={(event) => applyFilter(setType)(event.target.value)}
            sx={{ minWidth: { md: 180 } }}
          >
            <MenuItem value="">All types</MenuItem>
            {INTERVIEW_TYPES.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
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
                  <TableCell>Candidate</TableCell>
                  <TableCell>Position</TableCell>
                  <TableCell>Interviewer</TableCell>
                  <TableCell>Date &amp; Time</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  {canManage ? <TableCell align="right">Actions</TableCell> : null}
                </TableRow>
              </TableHead>

              {loading ? (
                <TableSkeleton rows={pageSize > 10 ? 10 : pageSize} columns={canManage ? 7 : 6} />
              ) : (
                <TableBody>
                  {data?.items?.map((interview) => (
                    <TableRow key={interview.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <UserAvatar name={interview.candidateName} size={34} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={600} noWrap>
                              {interview.candidateName}
                            </Typography>
                            <Typography variant="caption" component="p" noWrap>
                              {interview.candidateEmail}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Box>{interview.position}</Box>
                        <Typography variant="caption">{interview.department}</Typography>
                      </TableCell>
                      <TableCell>{interview.interviewerName}</TableCell>
                      <TableCell>
                        <Box>{formatDate(interview.date)}</Box>
                        <Typography variant="caption">
                          {formatTime(interview.time)} · {formatRelativeDay(interview.date)}
                        </Typography>
                      </TableCell>
                      <TableCell>{interview.type}</TableCell>
                      <TableCell>
                        <StatusChip status={interview.status} />
                      </TableCell>
                      {canManage ? (
                        <TableCell align="right">
                          <Tooltip title="Edit interview">
                            <IconButton
                              size="small"
                              aria-label={`Edit interview with ${interview.candidateName}`}
                              onClick={() => setDialogState({ open: true, interview })}
                            >
                              <Pencil size={16} strokeWidth={1.75} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              )}
            </Table>
          </TableContainer>

          {!loading && data?.items?.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No interviews found"
              description={
                hasFilters
                  ? 'No interviews match the current filters.'
                  : 'Nothing has been scheduled yet.'
              }
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
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}–${to} of ${pluralize(count, 'interview')}`
                }
              />
            </>
          ) : null}
        </QueryStateView>
      </Card>

      {dialogState.open ? (
        <InterviewFormDialog
          open
          interview={dialogState.interview}
          onClose={() => setDialogState({ open: false, interview: null })}
          onSaved={reload}
        />
      ) : null}
    </Box>
  )
}
