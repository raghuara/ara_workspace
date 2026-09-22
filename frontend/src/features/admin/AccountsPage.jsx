import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { KeyRound, ShieldCheck, UserPlus } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SectionCard } from '@/components/SectionCard'
import { SearchField } from '@/components/SearchField'
import { QueryStateView } from '@/components/QueryStateView'
import { EmptyState } from '@/components/EmptyState'
import { TableSkeleton } from '@/components/TableSkeleton'
import { ToneChip } from '@/components/ToneChip'
import { UserAvatar } from '@/components/UserAvatar'
import { accountService } from '@/api/accountService'
import { useAsync } from '@/hooks/useAsync'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useSession } from '@/hooks/useSession'
import { useWorkspace } from '@/hooks/useWorkspace'
import { colors, layout } from '@/theme/tokens'
import { formatDate } from '@/utils/date'
import { CreateLoginDialog, TemporaryPasswordDialog } from './LoginDialogs'
import { AdminRoleDialog } from './AdminRoleDialog'

const formatLastLogin = (iso) => (iso ? formatDate(iso.slice(0, 10)) : 'Never')

export const AccountsPage = () => {
  const { user } = useSession()
  const { activeWorkspace, activeWorkspaceId } = useWorkspace()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)

  const accounts = useAsync(
    accountService.listAccounts,
    [{ search: debouncedSearch, workspaceId: activeWorkspaceId }],
    {
      enabled: Boolean(activeWorkspaceId),
    },
  )
  const userTypes = useAsync(accountService.listUserTypes, [])

  const [creating, setCreating] = useState(null)
  const [revealed, setRevealed] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [rowError, setRowError] = useState('')

  const typeOptions = useMemo(() => userTypes.data ?? [], [userTypes.data])
  const typeIds = useMemo(() => new Set(typeOptions.map((type) => type.id)), [typeOptions])

  const summary = useMemo(() => {
    const rows = accounts.data ?? []
    return {
      total: rows.length,
      withLogin: rows.filter((row) => row.hasAccount).length,
      active: rows.filter((row) => row.hasAccount && row.isActive).length,
    }
  }, [accounts.data])

  const [typeChange, setTypeChange] = useState(null)
  const [confirmingType, setConfirmingType] = useState(false)

  const changeUserType = async (row, userTypeId) => {
    setRowError('')
    setBusyId(row.employeeId)
    try {
      await accountService.updateAccount(row.employeeId, { userTypeId })
      accounts.reload()
    } catch (caught) {
      if (caught.code === 'WORKSPACE_ADMIN_CONFLICT' || caught.code === 'WORKSPACE_ADMIN_REQUIRED') {
        setTypeChange({
          row,
          userTypeId,
          typeName: typeOptions.find((type) => type.id === userTypeId)?.name ?? 'Employee',
          code: caught.code,
          message: caught.message,
          workspaces: caught.details?.workspaces ?? [],
        })
      } else {
        setRowError(caught.message ?? 'That change could not be saved.')
      }
    } finally {
      setBusyId(null)
    }
  }

  const confirmTypeChange = async () => {
    setConfirmingType(true)
    try {
      await accountService.updateAccount(typeChange.row.employeeId, {
        userTypeId: typeChange.userTypeId,
        removeFromWorkspaceAdmins: true,
      })
      setTypeChange(null)
      accounts.reload()
    } catch (caught) {
      setTypeChange(null)
      setRowError(caught.message ?? 'That change could not be saved.')
    } finally {
      setConfirmingType(false)
    }
  }

  const runRowAction = async (employeeId, action) => {
    setRowError('')
    setBusyId(employeeId)
    try {
      await action()
      accounts.reload()
    } catch (caught) {
      setRowError(caught.message ?? 'That change could not be saved.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Box sx={{ maxWidth: layout.contentMaxWidth, mx: 'auto', px: { xs: 2, md: 3, lg: 4 }, py: { xs: 3, md: 4 } }}>
      <PageHeader
        title="Accounts"
        description={`${activeWorkspace?.name ?? 'Workspace'} · ${summary.withLogin} of ${summary.total} people can sign in · ${summary.active} active`}
        breadcrumbs={[{ label: 'Administration' }, { label: 'Access' }, { label: 'Accounts' }]}
      />

      <SectionCard padded={false}>
        <Box sx={{ p: 2 }}>
          <SearchField
            value={search}
            onChange={setSearch}
            label="Search people"
            placeholder="Name, ID, email, department…"
          />
        </Box>
        {rowError ? (
          <Alert severity="error" sx={{ mx: 2, mb: 2 }} onClose={() => setRowError('')}>
            {rowError}
          </Alert>
        ) : null}
        <QueryStateView error={accounts.error} onRetry={accounts.reload}>
          <TableContainer>
            <Table sx={{ minWidth: 860 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Login email</TableCell>
                  <TableCell>User type</TableCell>
                  <TableCell>Last sign-in</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              {accounts.loading && !accounts.data ? (
                <TableSkeleton rows={6} columns={6} />
              ) : (
                <TableBody>
                  {accounts.data?.map((row) => {
                    const isSelf = row.employeeId === user?.id
                    const busy = busyId === row.employeeId
                    const locked = isSelf || busy || !row.canManage
                    const typeKnown = typeIds.has(row.userTypeId)
                    return (
                      <TableRow key={row.employeeId} hover sx={{ opacity: row.hasAccount && !row.isActive ? 0.6 : 1 }}>
                        <TableCell>
                          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                            <UserAvatar name={row.fullName} size={32} />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body2" fontWeight={600} noWrap>
                                {row.fullName}
                                {isSelf ? (
                                  <Typography
                                    component="span"
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ ml: 0.75 }}
                                  >
                                    (you)
                                  </Typography>
                                ) : null}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                {row.employeeId} · {row.department} · {row.designation}
                                {row.workspaceId ? '' : ' · Organisation'}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color={row.hasAccount ? 'text.primary' : 'text.secondary'}>
                            {row.email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {row.hasAccount && row.canManage && typeKnown ? (
                            <TextField
                              select
                              size="small"
                              value={row.userTypeId}
                              disabled={locked}
                              onChange={(event) => changeUserType(row, Number(event.target.value))}
                              sx={{ minWidth: 160 }}
                              slotProps={{ select: { 'aria-label': `User type for ${row.fullName}` } }}
                            >
                              {typeOptions.map((type) => (
                                <MenuItem key={type.id} value={type.id}>
                                  {type.name}
                                </MenuItem>
                              ))}
                            </TextField>
                          ) : row.hasAccount ? (
                            <ToneChip label={row.userTypeName} tone="violet" />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color={row.lastLoginAt ? 'text.primary' : 'text.secondary'}>
                            {row.hasAccount ? formatLastLogin(row.lastLoginAt) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {!row.hasAccount ? (
                            <ToneChip label="No login" tone="gray" />
                          ) : row.mustChangePassword ? (
                            <ToneChip label="Temporary password" tone="amber" icon={KeyRound} />
                          ) : row.isActive ? (
                            <ToneChip label="Active" tone="green" icon={ShieldCheck} />
                          ) : (
                            <ToneChip label="Deactivated" tone="rose" />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {row.hasAccount ? (
                            <Stack
                              direction="row"
                              spacing={0.5}
                              sx={{ justifyContent: 'flex-end', alignItems: 'center' }}
                            >
                              <Tooltip
                                title={
                                  isSelf
                                    ? 'Use Change password in your profile menu'
                                    : row.canManage
                                      ? 'Reset password'
                                      : 'This login has more access than you can manage'
                                }
                              >
                                <span>
                                  <IconButton
                                    size="small"
                                    disabled={locked}
                                    aria-label={`Reset password for ${row.fullName}`}
                                    onClick={() =>
                                      runRowAction(row.employeeId, async () => {
                                        const result = await accountService.resetPassword(row.employeeId)
                                        setRevealed(result)
                                      })
                                    }
                                  >
                                    <KeyRound size={16} strokeWidth={1.75} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title={row.isActive ? 'Deactivate login' : 'Activate login'}>
                                <span>
                                  <Switch
                                    size="small"
                                    checked={Boolean(row.isActive)}
                                    disabled={locked}
                                    onChange={(event) =>
                                      runRowAction(row.employeeId, () =>
                                        accountService.updateAccount(row.employeeId, {
                                          isActive: event.target.checked,
                                        }),
                                      )
                                    }
                                    slotProps={{
                                      input: {
                                        'aria-label': `${row.isActive ? 'Deactivate' : 'Activate'} ${row.fullName}`,
                                      },
                                    }}
                                  />
                                </span>
                              </Tooltip>
                            </Stack>
                          ) : (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<UserPlus size={15} strokeWidth={1.75} />}
                              onClick={() => setCreating(row)}
                              disabled={typeOptions.length === 0}
                            >
                              Create login
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              )}
            </Table>
          </TableContainer>
          {!accounts.loading && accounts.data?.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="No people found"
              description={
                search ? 'Try a different search.' : 'Onboard employees first, then create their logins here.'
              }
            />
          ) : null}
        </QueryStateView>
      </SectionCard>

      {creating ? (
        <CreateLoginDialog
          account={creating}
          userTypes={typeOptions}
          onClose={() => setCreating(null)}
          onCreated={(result) => {
            setCreating(null)
            setRevealed(result)
            accounts.reload()
          }}
        />
      ) : null}

      {revealed ? <TemporaryPasswordDialog result={revealed} onClose={() => setRevealed(null)} /> : null}

      {typeChange ? (
        <AdminRoleDialog
          change={typeChange}
          confirming={confirmingType}
          onConfirm={confirmTypeChange}
          onClose={() => setTypeChange(null)}
        />
      ) : null}

      <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: colors.textSecondary }}>
        Logins use the employee's work email. Deactivating keeps the record but blocks sign-in. Switch workspace in the
        header to manage another company.
      </Typography>
    </Box>
  )
}
