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
import { Eye, FileSpreadsheet, Plus, RotateCcw, Users } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { SearchField } from '@/components/SearchField'
import { StatusChip } from '@/components/StatusChip'
import { UserAvatar } from '@/components/UserAvatar'
import { EmptyState } from '@/components/EmptyState'
import { QueryStateView } from '@/components/QueryStateView'
import { TableSkeleton } from '@/components/TableSkeleton'
import { departmentService } from '@/api/catalogService'
import { employeeService } from '@/api/employeeService'
import { EMPLOYMENT_STATUS } from '@/constants/domain'
import { PERMISSIONS } from '@/constants/permissions'
import { ROUTES, employeeDetailPath } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePermissions } from '@/hooks/usePermissions'
import { useWorkspace } from '@/hooks/useWorkspace'
import { EmployeeFormDialog } from './EmployeeFormDialog'
import { formatDate } from '@/utils/date'
import { pluralize } from '@/utils/format'

const STATUS_OPTIONS = Object.values(EMPLOYMENT_STATUS)

export const EmployeeListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const canOnboard = can(PERMISSIONS.EMPLOYEE_UPDATE)
  const { activeWorkspaceId, activeWorkspace } = useWorkspace()
  const [formOpen, setFormOpen] = useState(false)

  const [department, setDepartment] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  // The URL owns the search term so the header search can deep-link into this page.
  const search = searchParams.get('search') ?? ''
  const debouncedSearch = useDebouncedValue(search, 300)

  const setSearch = (value) => {
    setSearchParams(value ? { search: value } : {}, { replace: true })
    setPage(0)
  }

  const applyFilter = (setter) => (event) => {
    setter(event.target.value)
    setPage(0)
  }

  const query = useMemo(
    () => ({ workspaceId: activeWorkspaceId, search: debouncedSearch, department, status, page: page + 1, pageSize }),
    [activeWorkspaceId, debouncedSearch, department, status, page, pageSize],
  )

  const { data, loading, error, reload } = useAsync(employeeService.listEmployees, [query])
  const { data: departments } = useAsync(departmentService.list, [{ workspaceId: activeWorkspaceId }], {
    enabled: Boolean(activeWorkspaceId),
  })

  const hasFilters = Boolean(search || department || status)

  const resetFilters = () => {
    setDepartment('')
    setStatus('')
    setSearchParams({}, { replace: true })
    setPage(0)
  }

  return (
    <Box>
      <PageHeader
        title="Employees"
        description={`${activeWorkspace ? `People at ${activeWorkspace.name}. ` : ''}Filter by department or status, and open a profile for full details.`}
        breadcrumbs={[{ label: 'Employees' }]}
        actions={
          canOnboard ? (
            <>
              <Button
                component={Link}
                to={ROUTES.employeeImport}
                variant="outlined"
                startIcon={<FileSpreadsheet size={16} strokeWidth={2} aria-hidden="true" />}
              >
                Import from Excel
              </Button>
              <Button
                variant="contained"
                startIcon={<Plus size={16} strokeWidth={2} aria-hidden="true" />}
                onClick={() => setFormOpen(true)}
              >
                Onboard employee
              </Button>
            </>
          ) : null
        }
      />

      <EmployeeFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={(created) => {
          setFormOpen(false)
          navigate(employeeDetailPath(created.id), { state: { employee: created, onboarded: true } })
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
            onChange={setSearch}
            label="Search employees"
            placeholder="Search by name, ID, email…"
          />
          <TextField
            select
            size="small"
            label="Department"
            value={department}
            onChange={applyFilter(setDepartment)}
            sx={{ minWidth: { md: 180 } }}
          >
            <MenuItem value="">All departments</MenuItem>
            {(departments ?? []).map((option) => (
              <MenuItem key={option.id} value={option.name}>
                {option.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Status"
            value={status}
            onChange={applyFilter(setStatus)}
            sx={{ minWidth: { md: 160 } }}
          >
            <MenuItem value="">All statuses</MenuItem>
            {STATUS_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <Box sx={{ flex: 1 }} />
          {hasFilters ? (
            <Button
              onClick={resetFilters}
              size="small"
              variant="outlined"
              startIcon={<RotateCcw size={15} strokeWidth={1.75} />}
            >
              Reset
            </Button>
          ) : null}
        </Stack>
        <Divider />

        <QueryStateView error={error} onRetry={reload}>
          <TableContainer>
            <Table sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Employee ID</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Designation</TableCell>
                  <TableCell>Joining Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>

              {loading ? (
                <TableSkeleton rows={pageSize > 10 ? 10 : pageSize} columns={7} />
              ) : (
                <TableBody>
                  {data?.items?.map((employee) => (
                    <TableRow key={employee.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                          <UserAvatar name={employee.fullName} src={employee.avatarUrl} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={600} noWrap>
                              {employee.fullName}
                            </Typography>
                            <Typography variant="caption" component="p" noWrap>
                              {employee.email}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>{employee.employeeId}</TableCell>
                      <TableCell>{employee.department}</TableCell>
                      <TableCell>{employee.designation}</TableCell>
                      <TableCell>{formatDate(employee.joiningDate)}</TableCell>
                      <TableCell>
                        <StatusChip status={employee.status} />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View profile">
                          <IconButton
                            component={Link}
                            to={employeeDetailPath(employee.id)}
                            size="small"
                            aria-label={`View ${employee.fullName}`}
                          >
                            <Eye size={17} strokeWidth={1.75} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              )}
            </Table>
          </TableContainer>

          {!loading && data?.items?.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No employees found"
              description={
                hasFilters
                  ? 'No employees match the current filters. Try widening your search.'
                  : 'There are no employee records yet.'
              }
              actionLabel={hasFilters ? 'Reset filters' : undefined}
              onAction={hasFilters ? resetFilters : undefined}
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
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} of ${pluralize(count, 'employee')}`}
              />
            </>
          ) : null}
        </QueryStateView>
      </Card>
    </Box>
  )
}
