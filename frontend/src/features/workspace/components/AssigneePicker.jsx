import { useState } from 'react'
import { Box, Button, ButtonBase, Divider, Popover, Stack, Typography } from '@mui/material'
import { Check, UsersRound } from 'lucide-react'
import { UserAvatar } from '@/components/UserAvatar'
import { colors } from '@/theme/tokens'
import { assigneeChoices } from '../assigneeOptions'

const SectionLabel = ({ children }) => (
  <Typography
    variant="caption"
    component="p"
    sx={{
      px: 1.5,
      py: 0.625,
      bgcolor: colors.page,
      color: colors.textSecondary,
      fontWeight: 700,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      fontSize: '0.6875rem',
    }}
  >
    {children}
  </Typography>
)

const PersonRow = ({ member, selected, onToggle }) => (
  <ButtonBase
    onClick={onToggle}
    aria-pressed={selected}
    sx={{
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      px: 1.25,
      py: 0.75,
      justifyContent: 'flex-start',
      textAlign: 'left',
      bgcolor: selected ? colors.brandSoft : 'transparent',
      '&:hover': { bgcolor: selected ? colors.brandTint : colors.neutralSoft },
    }}
  >
    <UserAvatar name={member.fullName} size={26} />
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="body2" noWrap sx={{ fontWeight: selected ? 650 : 500, lineHeight: 1.3 }}>
        {member.fullName}
      </Typography>
      {member.designation || member.oversees ? (
        <Typography variant="caption" component="p" noWrap sx={{ color: colors.textSecondary }}>
          {member.oversees ? `${member.designation || 'Oversees'} · oversees` : member.designation}
        </Typography>
      ) : null}
    </Box>
    {selected ? <Check size={15} strokeWidth={2.5} color={colors.brand} aria-hidden="true" /> : null}
  </ButtonBase>
)

/**
 * Picks the people on a task. Nothing is handed back until Save, so a stray
 * tick can always be taken back with Cancel.
 */
export const AssigneePicker = ({
  anchorEl,
  team,
  group,
  members = [],
  value = [],
  title = 'Who is on this?',
  anchorOrigin = { vertical: 'bottom', horizontal: 'left' },
  transformOrigin = { vertical: 'top', horizontal: 'left' },
  onClose,
  onSave,
}) => {
  const [picked, setPicked] = useState(value)
  const [showEveryone, setShowEveryone] = useState(false)

  const choices = assigneeChoices({ team, group, members, selectedIds: picked })
  const changed = [...picked].sort().join('|') !== [...value].sort().join('|')

  const toggle = (employeeId) =>
    setPicked((current) =>
      current.includes(employeeId) ? current.filter((id) => id !== employeeId) : [...current, employeeId],
    )

  const save = () => {
    const byId = new Map([...choices.inScope, ...choices.rest].map((person) => [person.employeeId, person]))
    onSave(
      picked,
      picked.map((id) => ({ id, fullName: byId.get(id)?.fullName ?? '' })),
    )
    onClose()
  }

  const row = (member) => (
    <PersonRow
      key={member.employeeId}
      member={member}
      selected={picked.includes(member.employeeId)}
      onToggle={() => toggle(member.employeeId)}
    />
  )

  return (
    <Popover
      anchorEl={anchorEl}
      open
      onClose={onClose}
      anchorOrigin={anchorOrigin}
      transformOrigin={transformOrigin}
      slotProps={{ paper: { sx: { width: 276, maxWidth: 'calc(100vw - 24px)', borderRadius: 2.5, overflow: 'hidden' } } }}
    >
      <Box sx={{ px: 1.5, pt: 1.25, pb: 1, borderBottom: `1px solid ${colors.border}` }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant="caption" component="p" noWrap sx={{ color: colors.textSecondary }}>
          {choices.scoped ? `${choices.label} · pick one or more` : 'Everyone in this workspace'}
        </Typography>
      </Box>

      <Box sx={{ maxHeight: 248, overflowY: 'auto' }}>
        {(choices.scoped ? choices.inScope : members).map(row)}

        {choices.alsoAssigned.length > 0 ? (
          <>
            <Divider />
            <SectionLabel>Assigned from outside</SectionLabel>
            {choices.alsoAssigned.map(row)}
          </>
        ) : null}

        {choices.scoped && choices.rest.length > 0 ? (
          <>
            <Divider />
            {showEveryone ? (
              <>
                <SectionLabel>Elsewhere in this workspace</SectionLabel>
                {choices.rest.map(row)}
              </>
            ) : (
              <ButtonBase
                onClick={() => setShowEveryone(true)}
                sx={{
                  width: '100%',
                  display: 'flex',
                  gap: 1,
                  px: 1.5,
                  py: 0.875,
                  justifyContent: 'flex-start',
                  color: colors.textSecondary,
                  '&:hover': { bgcolor: colors.neutralSoft },
                }}
              >
                <UsersRound size={15} strokeWidth={1.75} aria-hidden="true" />
                <Typography variant="body2">Someone else ({choices.rest.length})</Typography>
              </ButtonBase>
            )}
          </>
        ) : null}
      </Box>

      <Stack
        direction="row"
        spacing={1}
        sx={{ px: 1.25, py: 1, alignItems: 'center', borderTop: `1px solid ${colors.border}`, bgcolor: colors.page }}
      >
        <Typography variant="caption" sx={{ flex: 1, minWidth: 0, color: colors.textSecondary }}>
          {picked.length === 0 ? 'Nobody yet' : `${picked.length} picked`}
        </Typography>
        <Button size="small" onClick={onClose} sx={{ color: colors.textSecondary }}>
          Cancel
        </Button>
        <Button size="small" variant="contained" disabled={!changed} onClick={save}>
          Save
        </Button>
      </Stack>
    </Popover>
  )
}
