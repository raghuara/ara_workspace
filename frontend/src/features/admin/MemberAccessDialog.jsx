import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { Eye, Layers, Pencil, Shield, UsersRound } from 'lucide-react'
import { ToneChip } from '@/components/ToneChip'
import { UserAvatar } from '@/components/UserAvatar'
import { workspaceService } from '@/api/workspaceService'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { colors } from '@/theme/tokens'

const LEVEL_LABEL = { edit: 'Edit', view: 'View', none: 'No access' }

const LevelToggle = ({ value, onChange, inheritLabel, size = 'small' }) => (
  <ToggleButtonGroup
    exclusive
    size={size}
    value={value ?? 'inherit'}
    onChange={(_, next) => {
      if (next !== null) onChange(next === 'inherit' ? null : next)
    }}
    sx={{
      '& .MuiToggleButton-root': { px: 1.25, py: 0.375, textTransform: 'none', fontSize: '0.75rem', fontWeight: 600 },
    }}
  >
    {inheritLabel ? (
      <ToggleButton value="inherit">{inheritLabel}</ToggleButton>
    ) : (
      <ToggleButton value="inherit">No access</ToggleButton>
    )}
    <ToggleButton value="view" sx={{ gap: 0.5 }}>
      <Eye size={13} strokeWidth={2} aria-hidden="true" /> View
    </ToggleButton>
    <ToggleButton value="edit" sx={{ gap: 0.5 }}>
      <Pencil size={13} strokeWidth={2} aria-hidden="true" /> Edit
    </ToggleButton>
  </ToggleButtonGroup>
)

const effective = (...levels) => levels.find((level) => level) ?? 'none'

export const MemberAccessDialog = ({ workspaceId, member, groups, onClose, onSaved }) => {
  const [workspace, setWorkspace] = useState(member.grants?.workspace ?? null)
  const [groupLevels, setGroupLevels] = useState({ ...(member.grants?.groups ?? {}) })
  const [teamLevels, setTeamLevels] = useState({ ...(member.grants?.teams ?? {}) })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const setGroup = (groupId, level) =>
    setGroupLevels((current) => {
      const next = { ...current }
      if (level) next[groupId] = level
      else delete next[groupId]
      return next
    })

  const setTeam = (teamId, level) =>
    setTeamLevels((current) => {
      const next = { ...current }
      if (level) next[teamId] = level
      else delete next[teamId]
      return next
    })

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const saved = await workspaceService.updateMemberAccess(workspaceId, member.employeeId, {
        workspace,
        groups: groupLevels,
        teams: teamLevels,
      })
      onSaved(saved)
    } catch (caught) {
      setError(caught.message ?? 'The access settings could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const workspaceLabel = LEVEL_LABEL[effective(workspace)]

  return (
    <Dialog open onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600 }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
          <UserAvatar name={member.fullName} size={34} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={600} noWrap>
              {member.fullName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
              {member.employeeId} · {member.designation} · {member.userTypeName}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Their user type decides <em>what</em> they can do. These settings decide <em>where</em>. The most specific
          setting wins: a team overrides its group, a group overrides the workspace. Tasks assigned to them are always
          visible.
        </Typography>

        <Box sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${colors.border}`, bgcolor: colors.page, mb: 2 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Shield size={16} strokeWidth={1.75} color={colors.textSecondary} aria-hidden="true" />
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  Whole workspace
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Applies to every group and team unless overridden below
                </Typography>
              </Box>
            </Stack>
            <LevelToggle value={workspace} onChange={setWorkspace} />
          </Stack>
        </Box>

        <Stack spacing={1.25}>
          {groups.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              This workspace has no groups yet.
            </Typography>
          ) : null}
          {groups.map((group) => {
            const tone = STATUS_TONES[group.tone] ?? STATUS_TONES.slate
            const groupEffective = effective(groupLevels[group.id], workspace)
            return (
              <Box key={group.id} sx={{ borderRadius: 2, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{
                    alignItems: { sm: 'center' },
                    justifyContent: 'space-between',
                    px: 1.5,
                    py: 1.125,
                    borderLeft: `3px solid ${tone.strong}`,
                  }}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                    <Layers size={15} strokeWidth={1.75} color={tone.strong} aria-hidden="true" />
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {group.name}
                    </Typography>
                    <ToneChip
                      label={LEVEL_LABEL[groupEffective]}
                      tone={groupEffective === 'edit' ? 'green' : groupEffective === 'view' ? 'amber' : 'gray'}
                    />
                  </Stack>
                  <LevelToggle
                    value={groupLevels[group.id] ?? null}
                    onChange={(level) => setGroup(group.id, level)}
                    inheritLabel={`Same as workspace (${workspaceLabel})`}
                  />
                </Stack>
                {group.teams.map((team) => {
                  const teamEffective = effective(teamLevels[team.id], groupLevels[group.id], workspace)
                  return (
                    <Stack
                      key={team.id}
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      sx={{
                        alignItems: { sm: 'center' },
                        justifyContent: 'space-between',
                        px: 1.5,
                        py: 0.875,
                        pl: 4.5,
                        borderTop: `1px solid ${colors.border}`,
                        bgcolor: colors.page,
                      }}
                    >
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                        <UsersRound size={14} strokeWidth={1.75} color={colors.textSecondary} aria-hidden="true" />
                        <Typography variant="body2" noWrap>
                          {team.name}
                        </Typography>
                        <ToneChip
                          label={LEVEL_LABEL[teamEffective]}
                          tone={teamEffective === 'edit' ? 'green' : teamEffective === 'view' ? 'amber' : 'gray'}
                        />
                      </Stack>
                      <LevelToggle
                        value={teamLevels[team.id] ?? null}
                        onChange={(level) => setTeam(team.id, level)}
                        inheritLabel={`Same as group (${LEVEL_LABEL[groupEffective]})`}
                      />
                    </Stack>
                  )
                })}
              </Box>
            )
          })}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} variant="outlined" disabled={saving}>
          Cancel
        </Button>
        <Button onClick={save} variant="contained" disabled={saving}>
          {saving ? 'Saving…' : 'Save access'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
