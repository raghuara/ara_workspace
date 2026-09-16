import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { Copy, Lock, Pencil, Plus, ShieldCheck, Trash2, Users } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SectionCard } from '@/components/SectionCard'
import { QueryStateView } from '@/components/QueryStateView'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ToneChip } from '@/components/ToneChip'
import { UserAvatar } from '@/components/UserAvatar'
import { adminService } from '@/api/adminService'
import { PERMISSIONS, PERMISSION_CATALOG } from '@/constants/permissions'
import { TONE_KEYS } from '@/constants/workspaceDomain'
import { useAsync } from '@/hooks/useAsync'
import { usePermissions } from '@/hooks/usePermissions'
import { useSession } from '@/hooks/useSession'
import { colors, layout } from '@/theme/tokens'

const TOTAL_PERMISSIONS = PERMISSION_CATALOG.reduce((sum, group) => sum + group.permissions.length, 0)
const CATALOG_KEYS = new Set(PERMISSION_CATALOG.flatMap((group) => group.permissions.map((p) => p.key)))

/** Create a new type, or edit the name / description / colour of an existing one. */
const UserTypeDialog = ({ userType, onClose, onSaved }) => {
  const isEditing = Boolean(userType)
  const [values, setValues] = useState({
    name: userType?.name ?? '',
    description: userType?.description ?? '',
    tone: userType?.tone ?? 'teal',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!values.name.trim()) {
      setError('A user type name is required.')
      return
    }
    setSaving(true)
    try {
      if (isEditing) {
        // System types keep their name; only description and colour are sent.
        const payload = userType.isSystem
          ? { description: values.description.trim(), tone: values.tone }
          : { name: values.name.trim(), description: values.description.trim(), tone: values.tone }
        await adminService.updateUserType(userType.id, payload)
      } else {
        await adminService.createUserType({ ...values, permissions: [] })
      }
      onSaved()
      onClose()
    } catch (caught) {
      setError(caught.message ?? 'The user type could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <Box component="form" onSubmit={submit} noValidate>
        <DialogTitle>{isEditing ? `Edit ${userType.name}` : 'New user type'}</DialogTitle>
        <DialogContent dividers>
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : null}
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <TextField
              label="Name"
              value={values.name}
              onChange={(event) => setValues((c) => ({ ...c, name: event.target.value }))}
              size="small"
              fullWidth
              required
              autoFocus={!isEditing}
              disabled={isEditing && userType.isSystem}
              helperText={isEditing && userType.isSystem ? 'System user types keep their name.' : ' '}
              placeholder="Reviewer, Producer, Auditor…"
            />
            <TextField
              label="Description"
              value={values.description}
              onChange={(event) => setValues((c) => ({ ...c, description: event.target.value }))}
              size="small"
              fullWidth
              multiline
              minRows={2}
              helperText="Shown wherever this type is listed, so say what the role is for."
            />
            <Box>
              <Typography variant="caption" component="p" sx={{ mb: 0.75 }}>
                Colour
              </Typography>
              <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap' }} useFlexGap>
                {TONE_KEYS.map((tone) => (
                  <Box
                    key={tone}
                    component="button"
                    type="button"
                    aria-label={`Colour ${tone}`}
                    aria-pressed={values.tone === tone}
                    onClick={() => setValues((c) => ({ ...c, tone }))}
                    sx={{ border: 0, background: 'none', p: 0, cursor: 'pointer' }}
                  >
                    <ToneChip
                      label={values.name || tone}
                      tone={tone}
                      sx={values.tone === tone ? { outline: `2px solid ${colors.brand}`, outlineOffset: 1 } : undefined}
                    />
                  </Box>
                ))}
              </Stack>
            </Box>
            {!isEditing ? (
              <Alert severity="info">A new type starts with no permissions. Grant them from the panel once it exists.</Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} variant="outlined" disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create user type'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

/**
 * Mounted with `key={userType.id}` so switching type resets the draft naturally.
 * `onDirtyChange` lets the page block a switch while there are unsaved edits.
 */
const PermissionEditor = ({ userType, canManage, onSaved, onDirtyChange, onEdit, onDuplicate, onRequestDelete }) => {
  const { refreshSession } = useSession()
  const [draft, setDraft] = useState(userType.permissions)
  const [state, setState] = useState({ saving: false, message: '', error: '' })

  const members = useAsync(adminService.listUserTypeMembers, [userType.id])

  const locked = userType.permissionsLocked
  const readOnly = locked || !canManage
  const sameAsSaved = (next) =>
    JSON.stringify([...next].sort()) === JSON.stringify([...userType.permissions].sort())
  const dirty = !sameAsSaved(draft)

  const update = (next) => {
    setDraft(next)
    onDirtyChange(!sameAsSaved(next))
  }

  const toggle = (key) => update(draft.includes(key) ? draft.filter((item) => item !== key) : [...draft, key])

  const toggleGroup = (group, enable) => {
    const keys = group.permissions.map((permission) => permission.key)
    update(enable ? [...new Set([...draft, ...keys])] : draft.filter((item) => !keys.includes(item)))
  }

  const save = async () => {
    setState({ saving: true, message: '', error: '' })
    try {
      await adminService.updateUserType(userType.id, { permissions: draft })
      await onSaved()
      await refreshSession()
      onDirtyChange(false)
      setState({ saving: false, message: 'Permissions updated.', error: '' })
    } catch (caught) {
      setState({ saving: false, message: '', error: caught.message ?? 'Could not save permissions.' })
    }
  }

  return (
    <Stack spacing={2}>
      <SectionCard
        title={
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <span>{userType.name}</span>
            <ToneChip label={`ID ${userType.id}`} tone={userType.tone} />
            {userType.isSystem ? <ToneChip label="System" tone="slate" /> : null}
          </Stack>
        }
        description={userType.description || 'No description yet.'}
        action={
          <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', alignItems: 'center' }} useFlexGap>
            {canManage ? (
              <>
                <Tooltip title="Edit name, description and colour">
                  <IconButton size="small" aria-label={`Edit ${userType.name}`} onClick={onEdit}>
                    <Pencil size={15} strokeWidth={1.75} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Duplicate as a new type">
                  <IconButton size="small" aria-label={`Duplicate ${userType.name}`} onClick={onDuplicate}>
                    <Copy size={15} strokeWidth={1.75} />
                  </IconButton>
                </Tooltip>
                {!userType.isSystem ? (
                  <Tooltip title="Delete user type">
                    <IconButton size="small" aria-label={`Delete ${userType.name}`} onClick={onRequestDelete}>
                      <Trash2 size={15} strokeWidth={1.75} />
                    </IconButton>
                  </Tooltip>
                ) : null}
              </>
            ) : null}
            {dirty ? (
              <Button size="small" variant="outlined" onClick={() => update(userType.permissions)} disabled={state.saving}>
                Discard
              </Button>
            ) : null}
            <Button size="small" variant="contained" disabled={!dirty || readOnly || state.saving} onClick={save}>
              {state.saving ? 'Saving…' : 'Save permissions'}
            </Button>
          </Stack>
        }
      >
        {userType.isSystem ? (
          <Alert severity="info" icon={<ShieldCheck size={18} strokeWidth={1.75} />} sx={{ mb: 2 }}>
            <strong>System user type.</strong> It cannot be renamed or deleted.{' '}
            {locked
              ? 'Master Admin permissions are fixed — removing them could leave nobody able to reach this screen.'
              : 'Its permissions can still be adjusted to suit your organisation.'}
          </Alert>
        ) : null}
        {!canManage ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            You can view permissions but not change them.
          </Alert>
        ) : null}
        {state.error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {state.error}
          </Alert>
        ) : null}
        {state.message ? (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setState((s) => ({ ...s, message: '' }))}>
            {state.message}
          </Alert>
        ) : null}

        <Stack spacing={2}>
          {PERMISSION_CATALOG.map((group) => {
            const keys = group.permissions.map((permission) => permission.key)
            const onCount = keys.filter((key) => draft.includes(key)).length
            const allOn = onCount === keys.length

            return (
              <Box key={group.key}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Box>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Typography variant="h4">{group.label}</Typography>
                      <ToneChip label={`${onCount}/${keys.length}`} tone={allOn ? 'green' : onCount ? 'blue' : 'gray'} />
                    </Stack>
                    <Typography variant="caption" component="p">
                      {group.description}
                    </Typography>
                  </Box>
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={allOn}
                        indeterminate={onCount > 0 && !allOn}
                        disabled={readOnly}
                        onChange={(event) => toggleGroup(group, event.target.checked)}
                      />
                    }
                    label={<Typography variant="caption">All</Typography>}
                    sx={{ mr: 0 }}
                  />
                </Stack>
                <Divider sx={{ mb: 0.75 }} />
                <Box sx={{ display: 'grid', gap: 0.25, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
                  {group.permissions.map((permission) => (
                    <FormControlLabel
                      key={permission.key}
                      control={
                        <Checkbox
                          size="small"
                          checked={draft.includes(permission.key)}
                          disabled={readOnly}
                          onChange={() => toggle(permission.key)}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2">{permission.label}</Typography>
                          <Typography variant="caption" component="p" sx={{ fontFamily: 'monospace' }}>
                            {permission.key}
                          </Typography>
                        </Box>
                      }
                      sx={{ alignItems: 'flex-start', py: 0.375, m: 0 }}
                    />
                  ))}
                </Box>
              </Box>
            )
          })}
        </Stack>
      </SectionCard>

      <SectionCard
        title="People on this type"
        description={
          members.data?.length
            ? `${members.data.length} ${members.data.length === 1 ? 'person' : 'people'} — a permission change applies to all of them`
            : 'Nobody is assigned yet'
        }
        padded={false}
      >
        <QueryStateView error={members.error} onRetry={members.reload}>
          {(members.data ?? []).length === 0 ? (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', px: 2, py: 1.5, color: colors.textSecondary }}>
              <Users size={15} strokeWidth={1.75} aria-hidden="true" />
              <Typography variant="caption">Assign people from Administration → Workspaces.</Typography>
            </Stack>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' } }}>
              {members.data.map((member) => (
                <Stack
                  key={member.id}
                  direction="row"
                  spacing={1.25}
                  sx={{ alignItems: 'center', px: 2, py: 1, borderBottom: `1px solid ${colors.border}` }}
                >
                  <UserAvatar name={member.fullName} size={28} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {member.fullName}
                    </Typography>
                    <Typography variant="caption" component="p" noWrap>
                      {member.designation}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    {member.workspaces.map((shortName) => (
                      <ToneChip key={shortName} label={shortName} tone="slate" />
                    ))}
                  </Stack>
                </Stack>
              ))}
            </Box>
          )}
        </QueryStateView>
      </SectionCard>
    </Stack>
  )
}

export const UserTypesPage = () => {
  const { can } = usePermissions()
  const canManage = can(PERMISSIONS.USERTYPE_MANAGE)
  const { data: userTypes, loading, error, reload } = useAsync(adminService.listUserTypes, [])

  const [selectedId, setSelectedId] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [pendingSelection, setPendingSelection] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [notice, setNotice] = useState('')

  const selected = useMemo(
    () => userTypes?.find((type) => type.id === selectedId) ?? userTypes?.[0] ?? null,
    [userTypes, selectedId],
  )

  // Switching with unsaved permission edits asks first instead of silently dropping them.
  const select = (id) => {
    if (id === selected?.id) return
    if (dirty) {
      setPendingSelection(id)
      return
    }
    setSelectedId(id)
  }

  const confirmSwitch = () => {
    setSelectedId(pendingSelection)
    setDirty(false)
    setPendingSelection(null)
  }

  const duplicate = async () => {
    try {
      const created = await adminService.duplicateUserType(selected.id)
      await reload()
      setSelectedId(created.id)
      setDirty(false)
      setNotice(`Created "${created.name}" from ${selected.name}. Rename it and adjust its permissions.`)
    } catch (caught) {
      setNotice(caught.message ?? 'The user type could not be duplicated.')
    }
  }

  const confirmDelete = async () => {
    setDeleteError('')
    try {
      await adminService.deleteUserType(deleteTarget.id)
      setDeleteTarget(null)
      setSelectedId(null)
      setDirty(false)
      reload()
    } catch (caught) {
      setDeleteError(caught.message ?? 'The user type could not be deleted.')
    }
  }

  return (
    <Box sx={{ maxWidth: layout.contentMaxWidth, mx: 'auto', px: { xs: 2, md: 3, lg: 4 }, py: { xs: 3, md: 4 } }}>
      <PageHeader
        title="User Types"
        description="Roles are permission sets, not named people. Master Admin, Admin and Employee always exist; add your own alongside them."
        breadcrumbs={[{ label: 'Administration' }, { label: 'User Types' }]}
        actions={
          canManage ? (
            <Button variant="contained" startIcon={<Plus size={16} strokeWidth={2} />} onClick={() => setDialog({ userType: null })}>
              New user type
            </Button>
          ) : null
        }
      />

      {notice ? (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>
          {notice}
        </Alert>
      ) : null}

      <QueryStateView error={error} onRetry={reload}>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '320px 1fr' }, alignItems: 'start' }}>
          <SectionCard title="User types" description={userTypes ? `${userTypes.length} defined` : undefined} padded={false}>
            {loading ? null : (
              <Stack>
                {userTypes?.map((type) => {
                  const active = selected?.id === type.id
                  const granted = type.permissions.filter((key) => CATALOG_KEYS.has(key)).length
                  return (
                    <Box
                      key={type.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => select(type.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') select(type.id)
                      }}
                      aria-current={active ? 'true' : undefined}
                      sx={{
                        px: 2,
                        py: 1.25,
                        cursor: 'pointer',
                        borderLeft: `3px solid ${active ? colors.brand : 'transparent'}`,
                        bgcolor: active ? colors.brandSoft : 'transparent',
                        borderBottom: `1px solid ${colors.border}`,
                        '&:hover': { bgcolor: active ? colors.brandSoft : colors.page },
                      }}
                    >
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography variant="body2" fontWeight={600} sx={{ flex: 1, minWidth: 0 }} noWrap>
                          {type.name}
                        </Typography>
                        <ToneChip label={`ID ${type.id}`} tone={type.tone} />
                        {type.isSystem ? (
                          <Tooltip title="System user type — cannot be renamed or deleted">
                            <Box sx={{ display: 'inline-flex', color: colors.textSecondary }}>
                              <Lock size={13} strokeWidth={1.75} aria-label="System user type" />
                            </Box>
                          </Tooltip>
                        ) : null}
                      </Stack>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5 }}>
                        <Box sx={{ flex: 1, height: 4, borderRadius: 999, bgcolor: colors.neutralSoft, overflow: 'hidden' }}>
                          <Box sx={{ width: `${(granted / TOTAL_PERMISSIONS) * 100}%`, height: '100%', bgcolor: colors.brand }} />
                        </Box>
                        <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
                          {granted}/{TOTAL_PERMISSIONS} · {type.memberCount} {type.memberCount === 1 ? 'person' : 'people'}
                        </Typography>
                      </Stack>
                    </Box>
                  )
                })}
              </Stack>
            )}
          </SectionCard>

          {selected ? (
            <PermissionEditor
              key={selected.id}
              userType={selected}
              canManage={canManage}
              onSaved={reload}
              onDirtyChange={setDirty}
              onEdit={() => setDialog({ userType: selected })}
              onDuplicate={duplicate}
              onRequestDelete={() => {
                setDeleteError('')
                setDeleteTarget(selected)
              }}
            />
          ) : null}
        </Box>
      </QueryStateView>

      {dialog ? (
        <UserTypeDialog
          userType={dialog.userType}
          onClose={() => setDialog(null)}
          onSaved={async () => {
            await reload()
            if (!dialog.userType) setNotice('User type created. Grant its permissions below.')
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingSelection)}
        title="Discard unsaved changes?"
        description="You have permission edits that have not been saved. Switching user type will discard them."
        confirmLabel="Discard and switch"
        onConfirm={confirmSwitch}
        onClose={() => setPendingSelection(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete user type"
        description={`Delete ${deleteTarget?.name ?? ''}? People still on this type must be reassigned first.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      >
        {deleteError ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {deleteError}
          </Alert>
        ) : null}
      </ConfirmDialog>
    </Box>
  )
}
