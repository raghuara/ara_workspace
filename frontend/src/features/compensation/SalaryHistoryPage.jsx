import { useMemo, useState } from 'react'
import {
  Autocomplete,
  Box,
  Card,
  Divider,
  Skeleton,
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
import { ReceiptText } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SearchField } from '@/components/SearchField'
import { SectionCard } from '@/components/SectionCard'
import { UserAvatar } from '@/components/UserAvatar'
import { EmptyState } from '@/components/EmptyState'
import { QueryStateView } from '@/components/QueryStateView'
import { TableSkeleton } from '@/components/TableSkeleton'
import { compensationService } from '@/api/compensationService'
import { PERMISSIONS } from '@/constants/permissions'
import { ROUTES } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePermissions } from '@/hooks/usePermissions'
import { colors } from '@/theme/tokens'
import { formatDate } from '@/utils/date'
import { formatCurrency, pluralize } from '@/utils/format'
import { RestrictedBanner } from './RestrictedBanner'
import { SalaryTimeline } from './SalaryTimeline'

export const SalaryHistoryPage = () => {
  const { can } = usePermissions()
  const canPickEmployee = can(PERMISSIONS.COMPENSATION_VIEW)

  const [search, setSearch] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const debouncedSearch = useDebouncedValue(search, 300)

  const handleSearchChange = (value) => {
    setSearch(value)
    setPage(0)
  }

  const handleEmployeeChange = (option) => {
    setSelectedEmployee(option)
    setPage(0)
  }

  const employees = useAsync(compensationService.listPayrollEmployees, [], {
    enabled: canPickEmployee,
  })

  const query = useMemo(
    () => ({
      search: debouncedSearch,
      employeeId: selectedEmployee?.id ?? '',
      page: page + 1,
      pageSize: selectedEmployee ? 50 : pageSize,
    }),
    [debouncedSearch, selectedEmployee, page, pageSize],
  )

  const { data, loading, error, reload } = useAsync(
    compensationService.listSalaryHistory,
    [query],
  )

  return (
    <Box>
      <PageHeader
        title="Salary History"
        description="Every recorded increment, with the previous and resulting salary."
        breadcrumbs={[{ label: 'Compensation', to: ROUTES.compensationOverview }, { label: 'Salary History' }]}
      />

      <RestrictedBanner />

      <Card sx={{ mb: 2.5 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'stretch', md: 'center' }}
          sx={{ p: 2.5 }}
        >
          <SearchField
            value={search}
            onChange={handleSearchChange}
            label="Search salary history"
            placeholder="Search employee, reason…"
          />
          {canPickEmployee ? (
            <Autocomplete
              options={employees.data ?? []}
              loading={employees.loading}
              value={selectedEmployee}
              onChange={(_, option) => handleEmployeeChange(option)}
              getOptionLabel={(option) => `${option.fullName} (${option.employeeId})`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => <TextField {...params} label="Employee" size="small" />}
              sx={{ minWidth: { md: 300 } }}
            />
          ) : null}
        </Stack>
      </Card>

      {selectedEmployee ? (
        <SectionCard
          title={`${selectedEmployee.fullName} — increment timeline`}
          description={`${selectedEmployee.designation} · ${selectedEmployee.department}`}
        >
          <QueryStateView error={error} onRetry={reload}>
            {loading ? (
              <Skeleton variant="rounded" height={220} />
            ) : data?.items?.length ? (
              <SalaryTimeline entries={data.items} />
            ) : (
              <EmptyState
                icon={ReceiptText}
                title="No increments recorded"
                description="This employee has no salary changes on file yet."
              />
            )}
          </QueryStateView>
        </SectionCard>
      ) : (
        <Card>
          <QueryStateView error={error} onRetry={reload}>
            <TableContainer>
              <Table sx={{ minWidth: 1020 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell align="right">Previous salary</TableCell>
                    <TableCell align="right">Increment</TableCell>
                    <TableCell align="right">New salary</TableCell>
                    <TableCell>Effective date</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Approved by</TableCell>
                  </TableRow>
                </TableHead>

                {loading ? (
                  <TableSkeleton rows={pageSize > 10 ? 10 : pageSize} columns={7} />
                ) : (
                  <TableBody>
                    {data?.items?.map((entry) => (
                      <TableRow key={entry.id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <UserAvatar name={entry.employee.fullName} size={34} />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body2" fontWeight={600} noWrap>
                                {entry.employee.fullName}
                              </Typography>
                              <Typography variant="caption" component="p" noWrap>
                                {entry.employee.designation}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">{formatCurrency(entry.previousSalary)}</TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600} sx={{ color: colors.success }}>
                            +{formatCurrency(entry.incrementAmount)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600}>
                            {formatCurrency(entry.newSalary)}
                          </Typography>
                        </TableCell>
                        <TableCell>{formatDate(entry.effectiveDate)}</TableCell>
                        <TableCell>{entry.reason}</TableCell>
                        <TableCell>{entry.approvedBy}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                )}
              </Table>
            </TableContainer>

            {!loading && data?.items?.length === 0 ? (
              <EmptyState
                icon={ReceiptText}
                title="No salary history"
                description="No increments match the current filters."
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
                  labelDisplayedRows={({ from, to, count }) => `${from}–${to} of ${pluralize(count, 'record')}`}
                />
              </>
            ) : null}
          </QueryStateView>
        </Card>
      )}
    </Box>
  )
}
