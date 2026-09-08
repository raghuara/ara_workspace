import { useState } from 'react'
import { Box, Card, Divider, Skeleton, Stack, Tab, Tabs, Typography } from '@mui/material'
import { Mail, Phone } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { QueryStateView } from '@/components/QueryStateView'
import { StatusChip } from '@/components/StatusChip'
import { UserAvatar } from '@/components/UserAvatar'
import { employeeService } from '@/api/employeeService'
import { ROUTES } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { colors } from '@/theme/tokens'
import { OverviewTab } from './tabs/OverviewTab'
import { PersonalInformationTab } from './tabs/PersonalInformationTab'
import { EmploymentTab } from './tabs/EmploymentTab'
import { DocumentsTab } from './tabs/DocumentsTab'
import { PerformanceTab } from './tabs/PerformanceTab'
import { RecruitmentHistoryTab } from './tabs/RecruitmentHistoryTab'

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'personal', label: 'Personal Information' },
  { value: 'employment', label: 'Employment' },
  { value: 'documents', label: 'Documents' },
  { value: 'performance', label: 'Performance' },
  { value: 'recruitment', label: 'Recruitment History' },
]

export const EmployeeDetailPage = () => {
  const { employeeId } = useParams()
  const [activeTab, setActiveTab] = useState('overview')

  const { data: employee, loading, error, reload, setData } = useAsync(
    employeeService.getEmployee,
    [employeeId],
  )

  return (
    <Box>
      <PageHeader
        title={employee?.fullName ?? 'Employee'}
        breadcrumbs={[
          { label: 'Employees', to: ROUTES.employees },
          { label: employee?.fullName ?? 'Loading…' },
        ]}
      />

      <QueryStateView error={error} onRetry={reload}>
        <Card sx={{ mb: 2.5 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2.5}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            sx={{ p: 2.5 }}
          >
            {loading ? (
              <Skeleton variant="circular" width={64} height={64} />
            ) : (
              <UserAvatar name={employee?.fullName} src={employee?.avatarUrl} size={64} />
            )}

            <Box sx={{ flex: 1, minWidth: 0 }}>
              {loading ? (
                <>
                  <Skeleton variant="text" width={200} height={28} />
                  <Skeleton variant="text" width={280} height={20} />
                </>
              ) : (
                <>
                  <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                    <Typography variant="h2" component="p">
                      {employee?.fullName}
                    </Typography>
                    <StatusChip status={employee?.status} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {employee?.designation} · {employee?.department} · {employee?.employeeId}
                  </Typography>
                  <Stack direction="row" spacing={2.5} flexWrap="wrap" sx={{ mt: 1.25 }}>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Mail size={14} strokeWidth={1.75} color={colors.textSecondary} aria-hidden="true" />
                      <Typography variant="body2" color="text.secondary">
                        {employee?.email}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Phone size={14} strokeWidth={1.75} color={colors.textSecondary} aria-hidden="true" />
                      <Typography variant="body2" color="text.secondary">
                        {employee?.phone}
                      </Typography>
                    </Stack>
                  </Stack>
                </>
              )}
            </Box>
          </Stack>

          <Divider />
          <Tabs
            value={activeTab}
            onChange={(_, value) => setActiveTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Employee sections"
            sx={{ px: 1 }}
          >
            {TABS.map((tab) => (
              <Tab key={tab.value} value={tab.value} label={tab.label} />
            ))}
          </Tabs>
        </Card>

        {loading || !employee ? (
          <Card sx={{ p: 2.5 }}>
            <Skeleton variant="rounded" height={220} />
          </Card>
        ) : (
          <Box role="tabpanel">
            {activeTab === 'overview' ? <OverviewTab employee={employee} /> : null}
            {activeTab === 'personal' ? (
              <PersonalInformationTab employee={employee} onSaved={setData} />
            ) : null}
            {activeTab === 'employment' ? <EmploymentTab employee={employee} /> : null}
            {activeTab === 'documents' ? <DocumentsTab employeeId={employee.id} /> : null}
            {activeTab === 'performance' ? <PerformanceTab employeeId={employee.id} /> : null}
            {activeTab === 'recruitment' ? <RecruitmentHistoryTab employeeId={employee.id} /> : null}
          </Box>
        )}
      </QueryStateView>
    </Box>
  )
}
