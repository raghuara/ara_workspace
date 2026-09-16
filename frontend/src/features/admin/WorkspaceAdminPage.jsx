import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { Building2, Layers, Plus, Trash2, UsersRound } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SectionCard } from '@/components/SectionCard'
import { EmptyState } from '@/components/EmptyState'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ToneChip } from '@/components/ToneChip'
import { UserAvatar } from '@/components/UserAvatar'
import { workspaceService } from '@/api/workspaceService'
import { employeeService } from '@/api/employeeService'
import { PERMISSIONS } from '@/constants/permissions'
import { TONE_KEYS } from '@/constants/workspaceDomain'
import { useAsync } from '@/hooks/useAsync'
import { usePermissions } from '@/hooks/usePermissions'
import { useWorkspace } from '@/hooks/useWorkspace'
import { colors, layout } from '@/theme/tokens'

const SimpleFormDialog = ({ title, fields, submitLabel, onSubmit, onClose }) => {
  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map((field) => [field.name, field.initial ?? ''])),
  )
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    const missing = fields.find((field) => field.required && !String(values[field.name]).trim())
    if (missing) {
      setError(`${missing.label} is required.`)
      return
    }
    setSaving(true)
    try {
      await onSubmit(values)
      onClose()
    } catch (caught) {
      setError(caught.message ?? 'That could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <Box component="form" onSubmit={submit} noValidate>
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600 }}>{title}</DialogTitle>
        <DialogContent dividers>
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : null}
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            {fields.map((field) => (
              <TextField
                key={field.name}
                label={field.label}
                value={values[field.name]}
                onChange={(event) => setValues((c) => ({ ...c, [field.name]: event.target.value }))}
                size="small"
                fullWidth
                required={field.required}
                select={Boolean(field.options)}
                multiline={field.multiline}
                minRows={field.multiline ? 2 : undefined}
                helperText={field.helperText}
                slotProps={{
                  select: {
                    renderValue: (selected) => {
                      const option = field.options?.find((candidate) => candidate.value === selected)
                      return option ? option.label : ''
                    },
                  },
                }}
              >
                {field.options?.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" noWrap>
                        {option.label}
                      </Typography>
                      {option.secondary ? (
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                          {option.secondary}
                        </Typography>
                      ) : null}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={onClose} variant="outlined" disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Saving…' : submitLabel}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

export const WorkspaceAdminPage = () => {
  const { can } = usePermissions()
  const { workspaces, activeWorkspace, activeWorkspaceId, groups, refreshStructure, refreshWorkspaces, selectWorkspace } =
    useWorkspace()

  const people = useAsync(employeeService.getEmployeeOptions, [])
  const [dialog, setDialog] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState('')

  const adminOptions = (people.data ?? []).map((person) => ({
    value: person.id,
    label: person.fullName,
    secondary: [person.employeeId, person.department, person.designation].filter(Boolean).join(' · '),
  }))

  const confirmDelete = async () => {
    setDeleteError('')
    try {
      if (deleteTarget.type === 'group') await workspaceService.deleteGroup(deleteTarget.id)
      if (deleteTarget.type === 'team') await workspaceService.deleteTeam(deleteTarget.id)
      setDeleteTarget(null)
      refreshStructure()
    } catch (caught) {
      setDeleteError(caught.message ?? 'That could not be deleted.')
    }
  }

  return (
    <Box sx={{ maxWidth: layout.contentMaxWidth, mx: 'auto', px: { xs: 2, md: 3, lg: 4 }, py: { xs: 3, md: 4 } }}>
      <PageHeader
        title="Workspaces"
        description="One account can run several companies. Each workspace has its own board, clients, members and admin."
        breadcrumbs={[{ label: 'Administration' }, { label: 'Workspaces' }]}
        actions={
          can(PERMISSIONS.WORKSPACE_CREATE) ? (
            <Button
              variant="contained"
              startIcon={<Plus size={16} strokeWidth={2} />}
              onClick={() =>
                setDialog({
                  title: 'New workspace',
                  submitLabel: 'Create workspace',
                  fields: [
                    { name: 'name', label: 'Workspace name', required: true },
                    { name: 'shortName', label: 'Short code', helperText: 'Two or three letters shown on the switcher.' },
                    { name: 'description', label: 'Description', multiline: true },
                    { name: 'tone', label: 'Colour', options: TONE_KEYS.map((t) => ({ value: t, label: t })), initial: 'blue' },
                    { name: 'adminId', label: 'Workspace admin', options: adminOptions },
                  ],
                  onSubmit: async (values) => {
                    await workspaceService.createWorkspace({
                      ...values,
                      adminIds: values.adminId ? [values.adminId] : [],
                    })
                    await refreshWorkspaces()
                  },
                })
              }
            >
              New workspace
            </Button>
          ) : null
        }
      />

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, mb: 2 }}>
        {workspaces.map((workspace) => {
          const active = workspace.id === activeWorkspaceId
          return (
            <Box
              key={workspace.id}
              role="button"
              tabIndex={0}
              onClick={() => selectWorkspace(workspace.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') selectWorkspace(workspace.id)
              }}
              aria-current={active ? 'true' : undefined}
              sx={{
                bgcolor: colors.surface,
                border: `1px solid ${active ? colors.brand : colors.border}`,
                borderRadius: 2.5,
                p: 2,
                cursor: 'pointer',
                '&:hover': { borderColor: colors.brand },
              }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                <ToneChip label={workspace.shortName} tone={workspace.tone} size="medium" />
                <Typography variant="h3" sx={{ flex: 1, minWidth: 0 }} noWrap>
                  {workspace.name}
                </Typography>
                {active ? <ToneChip label="Active" tone="green" /> : null}
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {workspace.description}
              </Typography>
              <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
                <Typography variant="caption">{workspace.groupCount} groups</Typography>
                <Typography variant="caption">{workspace.memberCount} members</Typography>
                <Typography variant="caption">{workspace.openTaskCount} open tasks</Typography>
              </Stack>
            </Box>
          )
        })}
      </Box>

      <SectionCard
        title={`Structure — ${activeWorkspace?.name ?? ''}`}
        description="Groups are departments. Teams sit inside a group and have their own lead."
        action={
          can(PERMISSIONS.GROUP_MANAGE) ? (
            <Button
              size="small"
              variant="outlined"
              startIcon={<Plus size={15} strokeWidth={2} />}
              onClick={() =>
                setDialog({
                  title: 'New group',
                  submitLabel: 'Create group',
                  fields: [
                    { name: 'name', label: 'Group name', required: true },
                    { name: 'tone', label: 'Colour', options: TONE_KEYS.map((t) => ({ value: t, label: t })), initial: 'blue' },
                    { name: 'leadId', label: 'Group lead', options: adminOptions },
                  ],
                  onSubmit: async (values) => {
                    await workspaceService.createGroup(activeWorkspaceId, values)
                    await refreshStructure()
                  },
                })
              }
            >
              Add group
            </Button>
          ) : null
        }
      >
        {groups.length === 0 ? (
          <EmptyState icon={Layers} title="No groups yet" description="Add a group to start organising teams and work." />
        ) : (
          <Stack spacing={2}>
            {groups.map((group) => (
              <Box key={group.id} sx={{ border: `1px solid ${colors.border}`, borderRadius: 2 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', px: 2, py: 1.5, bgcolor: colors.page, borderTopLeftRadius: 8, borderTopRightRadius: 8 }}
                >
                  <ToneChip label={group.name} tone={group.tone} size="medium" />
                  <Typography variant="caption" sx={{ flex: 1 }}>
                    Lead: {group.leadName} · {group.teams.length} teams
                  </Typography>
                  {can(PERMISSIONS.TEAM_MANAGE) ? (
                    <Button
                      size="small"
                      startIcon={<Plus size={14} strokeWidth={2} />}
                      onClick={() =>
                        setDialog({
                          title: `New team in ${group.name}`,
                          submitLabel: 'Create team',
                          fields: [
                            { name: 'name', label: 'Team name', required: true },
                            { name: 'leadId', label: 'Team lead', options: adminOptions },
                          ],
                          onSubmit: async (values) => {
                            await workspaceService.createTeam(group.id, values)
                            await refreshStructure()
                          },
                        })
                      }
                    >
                      Add team
                    </Button>
                  ) : null}
                  {can(PERMISSIONS.GROUP_MANAGE) ? (
                    <Tooltip title="Delete group">
                      <IconButton
                        size="small"
                        aria-label={`Delete ${group.name}`}
                        onClick={() => {
                          setDeleteError('')
                          setDeleteTarget({ type: 'group', id: group.id, name: group.name })
                        }}
                      >
                        <Trash2 size={15} strokeWidth={1.75} />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </Stack>
                <Divider />

                {group.teams.length === 0 ? (
                  <Typography variant="caption" component="p" sx={{ px: 2, py: 1.5 }}>
                    No teams in this group yet.
                  </Typography>
                ) : (
                  group.teams.map((team) => (
                    <Stack
                      key={team.id}
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1.5}
                      sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, px: 2, py: 1.25, borderBottom: `1px solid ${colors.border}`, '&:last-of-type': { borderBottom: 0 } }}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: 'center', flex: 1, minWidth: 0 }}
                      >
                        <UsersRound size={15} strokeWidth={1.75} color={colors.textSecondary} aria-hidden="true" />
                        <Typography variant="body2" fontWeight={600}>
                          {team.name}
                        </Typography>
                        <Typography variant="caption">Lead: {team.leadName}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={-0.5}>
                        {team.members.map((member) => (
                          <Tooltip key={member.id} title={member.fullName}>
                            <Box sx={{ ml: -0.5, '&:first-of-type': { ml: 0 } }}>
                              <UserAvatar name={member.fullName} size={26} />
                            </Box>
                          </Tooltip>
                        ))}
                      </Stack>
                      {can(PERMISSIONS.TEAM_MANAGE) ? (
                        <Tooltip title="Delete team">
                          <IconButton
                            size="small"
                            aria-label={`Delete ${team.name}`}
                            onClick={() => {
                              setDeleteError('')
                              setDeleteTarget({ type: 'team', id: team.id, name: team.name })
                            }}
                          >
                            <Trash2 size={15} strokeWidth={1.75} />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                    </Stack>
                  ))
                )}
              </Box>
            ))}
          </Stack>
        )}
      </SectionCard>

      {workspaces.length === 0 ? (
        <EmptyState icon={Building2} title="No workspaces" description="Create a workspace to get started." />
      ) : null}

      {dialog ? <SimpleFormDialog {...dialog} onClose={() => setDialog(null)} /> : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.type ?? ''}`}
        description={`Remove ${deleteTarget?.name ?? ''}? Groups holding tasks cannot be deleted.`}
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
