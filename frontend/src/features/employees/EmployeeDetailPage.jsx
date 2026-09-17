import { useState } from 'react'
import { Alert, Box, Button, Card, Divider, Skeleton, Stack, Tab, Tabs, Typography } from '@mui/material'
import { KeyRound, Mail, Pencil, Phone, ShieldCheck } from 'lucide-react'
import { useLocation, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { QueryStateView } from '@/components/QueryStateView'
import { StatusChip } from '@/components/StatusChip'
import { UserAvatar } from '@/components/UserAvatar'
import { employeeService } from '@/api/employeeService'
import { accountService } from '@/api/accountService'
import { PERMISSIONS } from '@/constants/permissions'
import { ROUTES } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { usePermissions } from '@/hooks/usePermissions'
import { useFeatures } from '@/hooks/useFeatures'
import { FEATURES } from '@/constants/features'
import { colors } from '@/theme/tokens'
import { EmployeeFormDialog } from './EmployeeFormDialog'
import { CreateLoginDialog, TemporaryPasswordDialog } from '@/features/admin/LoginDialogs'
import { ToneChip } from '@/components/ToneChip'
import { OverviewTab } from './tabs/OverviewTab'
import { EmploymentTab } from './tabs/EmploymentTab'
import { PerformanceTab } from './tabs/PerformanceTab'

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'employment', label: 'Employment' },
  { value: 'performance', label: 'Performance' },
]

export const EmployeeDetailPage = () => {
  const { employeeId } = useParams()
  const location = useLocation()
  const preloaded = location.state?.employee?.id === employeeId ? location.state.employee : undefined
  const [onboardedBanner, setOnboardedBanner] = useState(Boolean(location.state?.onboarded && preloaded))
  const [activeTab, setActiveTab] = useState('overview')
  const [editOpen, setEditOpen] = useState(false)
  const { can } = usePermissions()
  const { isEnabled } = useFeatures()
  const showPerformance = isEnabled(FEATURES.PERFORMANCE) && can(PERMISSIONS.REVIEW_VIEW)
  const tabs = TABS.filter((tab) => tab.value !== 'performance' || showPerformance)
  const canEdit = can(PERMISSIONS.EMPLOYEE_UPDATE)
  const canManageLogins = can(PERMISSIONS.ACCOUNT_MANAGE)
  const [loginOpen, setLoginOpen] = useState(false)
  const [revealed, setRevealed] = useState(null)
  const account = useAsync(accountService.getAccount, [employeeId], { enabled: canManageLogins })
  const login = account.data ?? null
  const needsLogin = canManageLogins && login && !login.hasAccount

  const {
    data: employee,
    loading,
    error,
    reload,
    setData,
  } = useAsync(employeeService.getEmployee, [employeeId], {
    initialData: preloaded,
  })

  return (
    <Box>
      <PageHeader
        title={employee?.fullName ?? 'Employee'}
        breadcrumbs={[{ label: 'Employees', to: ROUTES.employees }, { label: employee?.fullName ?? 'Loading…' }]}
        actions={
          employee ? (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
              {login?.hasAccount ? (
                <ToneChip
                  label={login.isActive ? `Can sign in · ${login.userTypeName}` : 'Login deactivated'}
                  tone={login.isActive ? 'green' : 'rose'}
                  icon={ShieldCheck}
                />
              ) : null}
              {needsLogin ? (
                <Button
                  variant="contained"
                  startIcon={<KeyRound size={15} strokeWidth={1.75} aria-hidden="true" />}
                  onClick={() => setLoginOpen(true)}
                >
                  Create login
                </Button>
              ) : null}
              {canEdit ? (
                <Button
                  variant="outlined"
                  startIcon={<Pencil size={15} strokeWidth={1.75} aria-hidden="true" />}
                  onClick={() => setEditOpen(true)}
                >
                  Edit
                </Button>
              ) : null}
            </Stack>
          ) : null
        }
      />

      <EmployeeFormDialog
        open={editOpen}
        employee={employee}
        onClose={() => setEditOpen(false)}
        onSaved={(updated) => {
          setEditOpen(false)
          setData(updated)
        }}
      />

      {onboardedBanner ? (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setOnboardedBanner(false)}
          action={
            needsLogin ? (
              <Button color="inherit" size="small" onClick={() => setLoginOpen(true)}>
                Create login
              </Button>
            ) : undefined
          }
        >
          {employee?.fullName} was onboarded successfully.
          {needsLogin
            ? ' Create their login now so they can sign in.'
            : canManageLogins
              ? ''
              : ' Ask an admin to create their login when they need to sign in.'}
        </Alert>
      ) : null}

      {loginOpen && login ? (
        <CreateLoginDialog
          account={login}
          onClose={() => setLoginOpen(false)}
          onCreated={(result) => {
            setLoginOpen(false)
            setRevealed(result)
            account.reload()
          }}
        />
      ) : null}

      {revealed ? <TemporaryPasswordDialog result={revealed} onClose={() => setRevealed(null)} /> : null}

      <QueryStateView error={error} onRetry={reload}>
        <Card sx={{ mb: 2 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, p: 2 }}
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
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography variant="h2" component="p">
                      {employee?.fullName}
                    </Typography>
                    <StatusChip status={employee?.status} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {employee?.designation} · {employee?.department} · {employee?.employeeId}
                  </Typography>
                  <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', mt: 1.25 }}>
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                      <Mail size={14} strokeWidth={1.75} color={colors.textSecondary} aria-hidden="true" />
                      <Typography variant="body2" color="text.secondary">
                        {employee?.email}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
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
            {tabs.map((tab) => (
              <Tab key={tab.value} value={tab.value} label={tab.label} />
            ))}
          </Tabs>
        </Card>

        {loading || !employee ? (
          <Card sx={{ p: 2 }}>
            <Skeleton variant="rounded" height={220} />
          </Card>
        ) : (
          <Box role="tabpanel">
            {activeTab === 'overview' ? <OverviewTab employee={employee} /> : null}
            {activeTab === 'employment' ? <EmploymentTab employee={employee} /> : null}
            {activeTab === 'performance' && showPerformance ? <PerformanceTab employeeId={employee.id} /> : null}
          </Box>
        )}
      </QueryStateView>
    </Box>
  )
}
