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
import { Banknote, TrendingUp, Users, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SearchField } from '@/components/SearchField'
import { StatCard } from '@/components/StatCard'
import { UserAvatar } from '@/components/UserAvatar'
import { EmptyState } from '@/components/EmptyState'
import { QueryStateView } from '@/components/QueryStateView'
import { TableSkeleton } from '@/components/TableSkeleton'
import { compensationService } from '@/api/compensationService'
import { DEPARTMENTS } from '@/constants/domain'
import { ROUTES } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatDate } from '@/utils/date'
import { formatCurrency, formatNumber, pluralize } from '@/utils/format'
import { RestrictedBanner } from './RestrictedBanner'

export const SalaryOverviewPage = () => {
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const debouncedSearch = useDebouncedValue(search, 300)

  const handleSearchChange = (value) => {
    setSearch(value)
    setPage(0)
  }

  const handleDepartmentChange = (event) => {
    setDepartment(event.target.value)
    setPage(0)
  }

  const query = useMemo(
    () => ({ search: debouncedSearch, department, page: page + 1, pageSize }),
    [debouncedSearch, department, page, pageSize],
  )

  const summary = useAsync(compensationService.getCompensationSummary, [])
  const { data, loading, error, reload } = useAsync(
    compensationService.listCompensation,
    [query],
  )

  return (
    <Box>
      <PageHeader
        title="Salary Overview"
        description="Current compensation for every employee on the payroll."
        breadcrumbs={[{ label: 'Compensation', to: ROUTES.compensationOverview }, { label: 'Salary Overview' }]}
      />

      <RestrictedBanner />

      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          mb: 2.5,
        }}
      >
        <StatCard
          label="Employees on payroll"
          value={formatNumber(summary.data?.employeesOnPayroll)}
          icon={Users}
          loading={summary.loading}
        />
        <StatCard
          label="Monthly payroll"
          value={formatCurrency(summary.data?.monthlyPayroll)}
          helperText="Total gross per month"
          icon={Wallet}
          loading={summary.loading}
        />
        <StatCard
          label="Average gross salary"
          value={formatCurrency(summary.data?.averageGrossSalary)}
          icon={Banknote}
          loading={summary.loading}
        />
        <StatCard
          label="Increments this year"
          value={formatNumber(summary.data?.incrementsThisYear)}
          icon={TrendingUp}
          loading={summary.loading}
        />
      </Box>

      <Card>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'stretch', md: 'center' }}
          sx={{ p: 2.5 }}
        >
          <SearchField
            value={search}
            onChange={handleSearchChange}
            label="Search payroll"
            placeholder="Search employee, ID…"
          />
          <TextField
            select
            size="small"
            label="Department"
            value={department}
            onChange={handleDepartmentChange}
            sx={{ minWidth: { md: 200 } }}
          >
            <MenuItem value="">All departments</MenuItem>
            {DEPARTMENTS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <Divider />

        <QueryStateView error={error} onRetry={reload}>
          <TableContainer>
            <Table sx={{ minWidth: 1000 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Pay grade</TableCell>
                  <TableCell align="right">Basic salary</TableCell>
                  <TableCell align="right">Allowances</TableCell>
                  <TableCell align="right">Gross salary</TableCell>
                  <TableCell>Last increment</TableCell>
                </TableRow>
              </TableHead>

              {loading ? (
                <TableSkeleton rows={pageSize > 10 ? 10 : pageSize} columns={7} />
              ) : (
                <TableBody>
                  {data?.items?.map((row) => (
                    <TableRow key={row.employeeId} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <UserAvatar name={row.employee.fullName} size={34} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={600} noWrap>
                              {row.employee.fullName}
                            </Typography>
                            <Typography variant="caption" component="p" noWrap>
                              {row.employee.designation}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>{row.employee.department}</TableCell>
                      <TableCell>{row.payGrade}</TableCell>
                      <TableCell align="right">{formatCurrency(row.basicSalary, row.currency)}</TableCell>
                      <TableCell align="right">{formatCurrency(row.allowances, row.currency)}</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600}>
                          {formatCurrency(row.grossSalary, row.currency)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {row.lastIncrementDate ? formatDate(row.lastIncrementDate) : 'No increment yet'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              )}
            </Table>
          </TableContainer>

          {!loading && data?.items?.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No compensation records"
              description="No payroll records match the current filters."
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
    </Box>
  )
}
