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
import { Building2, KeyRound, Layers, Pencil, Plus, Trash2, UsersRound } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SectionCard } from '@/components/SectionCard'
import { EmptyState } from '@/components/EmptyState'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ToneChip } from '@/components/ToneChip'
import { UserAvatar } from '@/components/UserAvatar'
import { PeoplePicker } from '@/components/PeoplePicker'
import { TonePicker } from '@/components/TonePicker'
import { MemberAccessDialog } from './MemberAccessDialog'
import { workspaceService } from '@/api/workspaceService'
import { employeeService } from '@/api/employeeService'
import { PERMISSIONS } from '@/constants/permissions'
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
    const missing = fields.find(
      (field) =>
        field.required &&
        (Array.isArray(values[field.name]) ? values[field.name].length === 0 : !String(values[field.name]).trim()),
    )
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
            {fields.map((field) =>
              field.tone ? (
                <TonePicker
                  key={field.name}
                  label={field.label}
                  value={values[field.name]}
                  onChange={(next) => setValues((c) => ({ ...c, [field.name]: next }))}
                  previewLabel={values.name}
                  helperText={field.helperText}
                />
              ) : field.people ? (
                <PeoplePicker
                  key={field.name}
                  label={field.label}
                  options={field.people}
                  multiple={Boolean(field.multiple)}
                  value={values[field.name]}
                  onChange={(next) => setValues((c) => ({ ...c, [field.name]: next }))}
                  required={field.required}
                  helperText={field.helperText}
                />
              ) : (
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
                      multiple: Boolean(field.multiple),
                      renderValue: (selected) => {
                        const picked = Array.isArray(selected) ? selected : [selected]
                        return picked
                          .map((value) => field.options?.find((candidate) => candidate.value === value)?.label)
                          .filter(Boolean)
                          .join(', ')
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
              ),
            )}
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
  const {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    groups,
    members,
    refreshStructure,
    refreshWorkspaces,
    selectWorkspace,
  } = useWorkspace()
  const [accessMember, setAccessMember] = useState(null)

  const summariseAccess = (member) => {
    const grants = member.grants ?? { workspace: null, groups: {}, teams: {} }
    const edits =
      Object.values(grants.groups).filter((level) => level === 'edit').length +
      Object.values(grants.teams).filter((level) => level === 'edit').length
    const views =
      Object.values(grants.groups).filter((level) => level === 'view').length +
      Object.values(grants.teams).filter((level) => level === 'view').length
    if (grants.workspace === 'edit') return { label: 'Whole workspace · Edit', tone: 'green' }
    if (grants.workspace === 'view')
      return { label: edits ? `Workspace · View, ${edits} edit` : 'Whole workspace · View', tone: 'amber' }
    if (edits || views)
      return {
        label: [edits ? `${edits} edit` : null, views ? `${views} view` : null].filter(Boolean).join(' · '),
        tone: edits ? 'teal' : 'amber',
      }
    return { label: 'Own tasks only', tone: 'gray' }
  }

  const people = useAsync(employeeService.getEmployeeOptions, [activeWorkspaceId], {
    enabled: Boolean(activeWorkspaceId),
  })
  const everyone = useAsync(employeeService.getEmployeeOptions, [undefined], {
    enabled: can(PERMISSIONS.WORKSPACE_CREATE),
  })
  const [dialog, setDialog] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState('')

  const peopleOptions = people.data ?? []
  const everyoneOptions = everyone.data ?? []

  const openEditWorkspace = (workspace) =>
    setDialog({
      title: `Edit ${workspace.name}`,
      submitLabel: 'Save workspace',
      fields: [
        { name: 'name', label: 'Workspace name', required: true, initial: workspace.name },
        {
          name: 'shortName',
          label: 'Short code',
          helperText: 'Two or three letters shown on the switcher.',
          initial: workspace.shortName,
        },
        { name: 'description', label: 'Description', multiline: true, initial: workspace.description ?? '' },
        { name: 'tone', label: 'Colour', tone: true, initial: workspace.tone },
        {
          name: 'adminIds',
          label: 'Workspace admins',
          people: everyoneOptions.length ? everyoneOptions : peopleOptions,
          multiple: true,
          required: true,
          initial: workspace.adminIds ?? [],
          helperText: 'Admins see everything in this workspace. Keep at least one.',
        },
      ],
      onSubmit: async (values) => {
        await workspaceService.updateWorkspace(workspace.id, values)
        await refreshWorkspaces()
        refreshStructure()
      },
    })

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
        breadcrumbs={[{ label: 'Administration' }, { label: 'Setup' }, { label: 'Workspaces' }]}
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
                    {
                      name: 'shortName',
                      label: 'Short code',
                      helperText: 'Two or three letters shown on the switcher.',
                    },
                    { name: 'description', label: 'Description', multiline: true },
                    { name: 'tone', label: 'Colour', tone: true, initial: 'blue' },
                    {
                      name: 'adminId',
                      label: 'Workspace admin',
                      people: everyoneOptions,
                      helperText:
                        'Pick yourself to start, then onboard the real admin inside the new workspace and hand it over.',
                    },
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
                {can(PERMISSIONS.WORKSPACE_UPDATE) ? (
                  <Tooltip title="Edit workspace">
                    <IconButton
                      size="small"
                      aria-label={`Edit ${workspace.name}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        openEditWorkspace(workspace)
                      }}
                    >
                      <Pencil size={15} strokeWidth={1.75} />
                    </IconButton>
                  </Tooltip>
                ) : null}
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
                    { name: 'tone', label: 'Colour', tone: true, initial: 'blue' },
                    { name: 'leadId', label: 'Group lead', people: peopleOptions },
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
          <EmptyState
            icon={Layers}
            title="No groups yet"
            description="Add a group to start organising teams and work."
          />
        ) : (
          <Stack spacing={2}>
            {groups.map((group) => (
              <Box key={group.id} sx={{ border: `1px solid ${colors.border}`, borderRadius: 2 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    alignItems: 'center',
                    px: 2,
                    py: 1.5,
                    bgcolor: colors.page,
                    borderTopLeftRadius: 8,
                    borderTopRightRadius: 8,
                  }}
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
                            { name: 'leadId', label: 'Team lead', people: peopleOptions },
                            {
                              name: 'memberIds',
                              label: 'Members',
                              people: peopleOptions,
                              multiple: true,
                              initial: [],
                              helperText: 'Tick everyone on this team. Members join the workspace automatically.',
                            },
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
                      sx={{
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        px: 2,
                        py: 1.25,
                        borderBottom: `1px solid ${colors.border}`,
                        '&:last-of-type': { borderBottom: 0 },
                      }}
                    >
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
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
                        <Tooltip title="Edit team">
                          <IconButton
                            size="small"
                            aria-label={`Edit ${team.name}`}
                            onClick={() =>
                              setDialog({
                                title: `Edit ${team.name}`,
                                submitLabel: 'Save team',
                                fields: [
                                  { name: 'name', label: 'Team name', required: true, initial: team.name },
                                  {
                                    name: 'leadId',
                                    label: 'Team lead',
                                    people: peopleOptions,
                                    initial: team.leadId ?? '',
                                  },
                                  {
                                    name: 'memberIds',
                                    label: 'Members',
                                    people: peopleOptions,
                                    multiple: true,
                                    initial: team.memberIds ?? [],
                                  },
                                ],
                                onSubmit: async (values) => {
                                  await workspaceService.updateTeam(team.id, values)
                                  await refreshStructure()
                                },
                              })
                            }
                          >
                            <Pencil size={15} strokeWidth={1.75} />
                          </IconButton>
                        </Tooltip>
                      ) : null}
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

      {activeWorkspace ? (
        <SectionCard
          title="Members"
          description="Who belongs to this workspace and how much of the board each person sees"
          padded={false}
        >
          {members.length === 0 ? (
            <EmptyState
              icon={UsersRound}
              title="No members yet"
              description="Add people to a team and they join the workspace."
            />
          ) : (
            <Stack>
              {members.map((member) => {
                const isAdmin = member.userTypeId === 1 || (activeWorkspace?.adminIds ?? []).includes(member.employeeId)
                const summary = summariseAccess(member)
                return (
                  <Stack
                    key={member.employeeId}
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    sx={{
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      px: 2,
                      py: 1.25,
                      borderBottom: `1px solid ${colors.border}`,
                      '&:last-of-type': { borderBottom: 0 },
                    }}
                  >
                    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
                      <UserAvatar name={member.fullName} size={30} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {member.fullName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                          {member.employeeId} · {member.designation}
                        </Typography>
                      </Box>
                    </Stack>
                    <ToneChip label={member.userTypeName} tone={isAdmin ? 'violet' : 'slate'} />
                    {isAdmin ? (
                      <ToneChip label="Full access (admin)" tone="violet" icon={KeyRound} />
                    ) : (
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <ToneChip label={summary.label} tone={summary.tone} />
                        {can(PERMISSIONS.WORKSPACE_UPDATE) ? (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<KeyRound size={14} strokeWidth={1.75} />}
                            onClick={() => setAccessMember(member)}
                          >
                            Access
                          </Button>
                        ) : null}
                      </Stack>
                    )}
                  </Stack>
                )
              })}
            </Stack>
          )}
        </SectionCard>
      ) : null}

      {workspaces.length === 0 ? (
        <EmptyState icon={Building2} title="No workspaces" description="Create a workspace to get started." />
      ) : null}

      {dialog ? <SimpleFormDialog {...dialog} onClose={() => setDialog(null)} /> : null}

      {accessMember ? (
        <MemberAccessDialog
          workspaceId={activeWorkspaceId}
          member={accessMember}
          groups={groups}
          onClose={() => setAccessMember(null)}
          onSaved={() => {
            setAccessMember(null)
            refreshStructure()
          }}
        />
      ) : null}

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
