import { Box, Stack, Typography } from '@mui/material'
import { DefinitionList } from '@/components/DefinitionList'
import { SectionCard } from '@/components/SectionCard'
import { EmptyState } from '@/components/EmptyState'
import { QueryStateView } from '@/components/QueryStateView'
import { StatusChip } from '@/components/StatusChip'
import { UserAvatar } from '@/components/UserAvatar'
import { employeeService } from '@/api/employeeService'
import { useAsync } from '@/hooks/useAsync'
import { formatDate, formatTenure } from '@/utils/date'
import { colors } from '@/theme/tokens'

export const OverviewTab = ({ employee }) => {
  const reports = useAsync(employeeService.getDirectReports, [employee.id])

  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1.4fr 1fr' } }}>
      <SectionCard title="Overview" description="Key details for this employee">
        <DefinitionList
          columns={{ xs: 1, sm: 2, lg: 2 }}
          items={[
            { label: 'Employee ID', value: employee.employeeId },
            { label: 'Full name', value: employee.fullName },
            { label: 'Work email', value: employee.email },
            { label: 'Contact number', value: employee.phone },
            { label: 'Department', value: employee.department },
            { label: 'Designation', value: employee.designation },
            { label: 'Reporting manager', value: employee.reportingManager },
            { label: 'Work location', value: employee.workLocation },
            { label: 'Joined', value: formatDate(employee.joiningDate) },
            { label: 'Tenure', value: formatTenure(employee.joiningDate) },
            { label: 'Employment status', value: <StatusChip status={employee.status} /> },
            { label: 'Employment type', value: employee.employmentType },
          ]}
        />
      </SectionCard>

      <SectionCard title="Direct reports" padded={false}>
        <QueryStateView error={reports.error} onRetry={reports.reload}>
          {reports.data?.length ? (
            reports.data.map((report) => (
              <Stack
                key={report.id}
                direction="row"
                spacing={1.5}
                sx={{ alignItems: 'center', px: 2,
                  py: 1.5,
                  borderBottom: `1px solid ${colors.border}`,
                  '&:last-of-type': { borderBottom: 0 }, }}
              >
                <UserAvatar name={report.fullName} size={32} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {report.fullName}
                  </Typography>
                  <Typography variant="caption" component="p" noWrap>
                    {report.designation}
                  </Typography>
                </Box>
                <StatusChip status={report.status} />
              </Stack>
            ))
          ) : reports.loading ? null : (
            <EmptyState title="No direct reports" description="This employee does not manage anyone." />
          )}
        </QueryStateView>
      </SectionCard>
    </Box>
  )
}
