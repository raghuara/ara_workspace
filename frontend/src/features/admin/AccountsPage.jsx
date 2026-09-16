import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { Copy, KeyRound, ShieldCheck, UserPlus } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SectionCard } from '@/components/SectionCard'
import { SearchField } from '@/components/SearchField'
import { QueryStateView } from '@/components/QueryStateView'
import { EmptyState } from '@/components/EmptyState'
import { TableSkeleton } from '@/components/TableSkeleton'
import { ToneChip } from '@/components/ToneChip'
import { UserAvatar } from '@/components/UserAvatar'
import { accountService } from '@/api/accountService'
import { adminService } from '@/api/adminService'
import { useAsync } from '@/hooks/useAsync'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useSession } from '@/hooks/useSession'
import { colors, layout } from '@/theme/tokens'
import { formatDate } from '@/utils/date'

const formatLastLogin = (iso) => (iso ? formatDate(iso.slice(0, 10)) : 'Never')

const TemporaryPasswordDialog = ({ result, onClose }) => {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.temporaryPassword)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600 }}>Temporary password</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          Share this with <strong>{result.account.fullName}</strong>. It is shown only once — they will be asked to set
          their own password at first sign-in.
        </Typography>
        <Stack spacing={1}>
          <TextField label="Login email" value={result.account.email} size="small" fullWidth slotProps={{ input: { readOnly: true } }} />
          <TextField
            label="Temporary password"
            value={result.temporaryPassword}
            size="small"
            fullWidth
            slotProps={{
              input: {
                readOnly: true,
                sx: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', letterSpacing: '0.04em' },
                endAdornment: (
                  <Tooltip title={copied ? 'Copied' : 'Copy'}>
                    <IconButton size="small" onClick={copy} aria-label="Copy temporary password">
                      <Copy size={16} strokeWidth={1.75} />
                    </IconButton>
                  </Tooltip>
                ),
              },
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} variant="contained">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  )
}

const CreateLoginDialog = ({ account, userTypes, onClose, onCreated }) => {
  const [userTypeId, setUserTypeId] = useState(userTypes.find((type) => type.slug === 'employee')?.id ?? userTypes[0]?.id ?? '')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const result = await accountService.createAccount({
        employeeId: account.employeeId,
        userTypeId,
        password: password.trim() || undefined,
      })
      onCreated(result)
    } catch (caught) {
      if (caught.details) setErrors(caught.details)
      else setError(caught.message ?? 'The login could not be created.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
      <Box component="form" onSubmit={submit} noValidate>
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600 }}>Create login for {account.fullName}</DialogTitle>
        <DialogContent dividers>
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : null}
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <TextField label="Login email" value={account.email} size="small" fullWidth slotProps={{ input: { readOnly: true } }} helperText="Their work email." />
            <TextField
              select
              label="User type"
              value={userTypeId}
              onChange={(event) => setUserTypeId(event.target.value)}
              size="small"
              fullWidth
              required
              error={Boolean(errors.userTypeId)}
              helperText={errors.userTypeId ?? 'Decides what they can see and do.'}
            >
              {userTypes.map((type) => (
                <MenuItem key={type.id} value={type.id}>
                  {type.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Temporary password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setErrors((current) => ({ ...current, password: undefined }))
              }}
              size="small"
              fullWidth
              error={Boolean(errors.password)}
              helperText={errors.password ?? 'Leave blank to generate one automatically.'}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={onClose} variant="outlined" disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Creating…' : 'Create login'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

export const AccountsPage = () => {
  const { user } = useSession()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)

  const accounts = useAsync(accountService.listAccounts, [{ search: debouncedSearch }])
  const userTypes = useAsync(adminService.listUserTypes, [])

  const [creating, setCreating] = useState(null)
  const [revealed, setRevealed] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [rowError, setRowError] = useState('')

  const typeOptions = useMemo(() => userTypes.data ?? [], [userTypes.data])

  const summary = useMemo(() => {
    const rows = accounts.data ?? []
    return {
      total: rows.length,
      withLogin: rows.filter((row) => row.hasAccount).length,
      active: rows.filter((row) => row.hasAccount && row.isActive).length,
    }
  }, [accounts.data])

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
        description={`${summary.withLogin} of ${summary.total} employees can sign in · ${summary.active} active`}
        breadcrumbs={[{ label: 'Administration' }, { label: 'Accounts' }]}
      />

      <SectionCard padded={false}>
        <Box sx={{ p: 2 }}>
          <SearchField value={search} onChange={setSearch} label="Search employees" placeholder="Name, ID, email, department…" />
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
                    return (
                      <TableRow key={row.employeeId} hover sx={{ opacity: row.hasAccount && !row.isActive ? 0.6 : 1 }}>
                        <TableCell>
                          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                            <UserAvatar name={row.fullName} size={32} />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body2" fontWeight={600} noWrap>
                                {row.fullName}
                                {isSelf ? (
                                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                                    (you)
                                  </Typography>
                                ) : null}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                {row.employeeId} · {row.department} · {row.designation}
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
                          {row.hasAccount ? (
                            <TextField
                              select
                              size="small"
                              value={row.userTypeId}
                              disabled={isSelf || busy}
                              onChange={(event) =>
                                runRowAction(row.employeeId, () =>
                                  accountService.updateAccount(row.employeeId, { userTypeId: Number(event.target.value) }),
                                )
                              }
                              sx={{ minWidth: 160 }}
                              slotProps={{ select: { 'aria-label': `User type for ${row.fullName}` } }}
                            >
                              {typeOptions.map((type) => (
                                <MenuItem key={type.id} value={type.id}>
                                  {type.name}
                                </MenuItem>
                              ))}
                            </TextField>
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
                            <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
                              <Tooltip title={isSelf ? "Use Change password in your profile menu" : "Reset password"}>
                                <span>
                                  <IconButton
                                    size="small"
                                    disabled={busy || isSelf}
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
                                    disabled={isSelf || busy}
                                    onChange={(event) =>
                                      runRowAction(row.employeeId, () =>
                                        accountService.updateAccount(row.employeeId, { isActive: event.target.checked }),
                                      )
                                    }
                                    slotProps={{ input: { 'aria-label': `${row.isActive ? 'Deactivate' : 'Activate'} ${row.fullName}` } }}
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
            <EmptyState icon={UserPlus} title="No employees found" description="Try a different search." />
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

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, color: colors.textSecondary }}>
        Logins use the employee's work email. Deactivating keeps the record but blocks sign-in.
      </Typography>
    </Box>
  )
}
