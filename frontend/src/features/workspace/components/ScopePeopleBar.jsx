import { useMemo, useState } from 'react'
import { Box, ButtonBase, IconButton, Popover, Stack, Tab, Tabs, Tooltip, Typography } from '@mui/material'
import { ChevronDown, Eye, ListFilter, ShieldCheck, UsersRound, X } from 'lucide-react'
import { ToneChip } from '@/components/ToneChip'
import { UserAvatar } from '@/components/UserAvatar'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { colors } from '@/theme/tokens'

const KINDS = [
  {
    key: 'worker',
    label: 'Workers',
    single: 'Worker',
    icon: UsersRound,
    tone: 'blue',
    hint: 'People who do the work in these teams',
  },
  {
    key: 'overseer',
    label: 'Overseers',
    single: 'Overseer',
    icon: Eye,
    tone: 'teal',
    hint: 'Watch over the work without doing it',
  },
  { key: 'lead', label: 'Team leads', single: 'Team lead', icon: ShieldCheck, tone: 'violet', hint: 'Run each team' },
]

const plural = (count, name) => {
  if (count === 1) return name
  if (/[^aeiou]y$/i.test(name)) return `${name.slice(0, -1)}ies`
  return /s$/i.test(name) ? name : `${name}s`
}

const collectPeople = (teams, directory) => {
  const people = new Map()
  const add = (kind, id, fullName, designation, teamName) => {
    if (!id) return
    const key = `${kind}|${id}`
    if (!people.has(key)) {
      people.set(key, {
        id,
        kind,
        fullName: fullName || directory.get(id)?.fullName || 'Unknown',
        designation: designation || directory.get(id)?.designation || 'Member',
        teams: [],
      })
    }
    const person = people.get(key)
    if (teamName && !person.teams.includes(teamName)) person.teams.push(teamName)
  }

  teams.forEach((team) => {
    if (team.leadId) add('lead', team.leadId, team.leadName !== '—' ? team.leadName : null, null, team.name)
    ;(team.members ?? []).forEach((member) => {
      if (member.id === team.leadId) return
      add(member.role === 'supervisor' ? 'overseer' : 'worker', member.id, member.fullName, member.designation, team.name)
    })
  })

  const byKind = Object.fromEntries(KINDS.map((kind) => [kind.key, []]))
  people.forEach((person) => byKind[person.kind].push(person))
  Object.values(byKind).forEach((list) => list.sort((a, b) => a.fullName.localeCompare(b.fullName)))
  return byKind
}

const breakdownOf = (people) =>
  Object.entries(
    people.reduce((counts, person) => {
      counts[person.designation] = (counts[person.designation] ?? 0) + 1
      return counts
    }, {}),
  ).sort(([nameA, a], [nameB, b]) => b - a || nameA.localeCompare(nameB))

const CountPill = ({ kind, count, onClick }) => {
  const tone = STATUS_TONES[kind.tone]
  const empty = count === 0
  return (
    <Tooltip title={empty ? `No ${kind.label.toLowerCase()} yet` : `${kind.hint} — click to see who`}>
      <span>
        <ButtonBase
          onClick={onClick}
          disabled={empty}
          aria-haspopup="dialog"
          aria-label={`${count} ${kind.label}`}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            height: 40,
            pl: 0.75,
            pr: 1.25,
            borderRadius: 2,
            border: `1px solid ${empty ? colors.border : tone.border}`,
            bgcolor: empty ? colors.surface : tone.soft,
            opacity: empty ? 0.6 : 1,
            transition: 'box-shadow 140ms ease, transform 120ms ease',
            '&:hover': { boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)' },
            '&:active': { transform: 'scale(0.98)' },
            '&:focus-visible': { boxShadow: `0 0 0 2px ${colors.surface}, 0 0 0 4px ${tone.strong}` },
          }}
        >
          <Box
            sx={{
              display: 'grid',
              placeItems: 'center',
              width: 28,
              height: 28,
              borderRadius: 1.5,
              bgcolor: empty ? colors.neutralSoft : tone.strong,
              color: empty ? colors.textSecondary : '#FFFFFF',
            }}
          >
            <kind.icon size={15} strokeWidth={2} aria-hidden="true" />
          </Box>
          <Typography
            component="span"
            sx={{ fontSize: '1.0625rem', fontWeight: 800, color: empty ? colors.textSecondary : tone.strong, fontVariantNumeric: 'tabular-nums' }}
          >
            {count}
          </Typography>
          <Typography component="span" sx={{ fontSize: '0.8125rem', fontWeight: 600, color: colors.textPrimary }}>
            {plural(count, kind.single)}
          </Typography>
          {empty ? null : <ChevronDown size={14} strokeWidth={2} color={tone.strong} aria-hidden="true" />}
        </ButtonBase>
      </span>
    </Tooltip>
  )
}

const PersonRow = ({ person, onShowTasks }) => (
  <Stack
    direction="row"
    spacing={1.25}
    sx={{
      alignItems: 'center',
      px: 1.75,
      py: 1,
      borderBottom: `1px solid ${colors.border}`,
      '&:last-of-type': { borderBottom: 0 },
      '&:hover': { bgcolor: colors.page },
      '&:hover .show-tasks': { opacity: 1 },
    }}
  >
    <UserAvatar name={person.fullName} size={32} />
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
        {person.fullName}
      </Typography>
      <Stack direction="row" spacing={0.5} useFlexGap sx={{ mt: 0.25, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="caption" sx={{ color: colors.textSecondary, mr: 0.25 }}>
          {person.designation}
        </Typography>
        {person.teams.map((teamName) => (
          <ToneChip key={teamName} label={teamName} tone="slate" />
        ))}
      </Stack>
    </Box>
    {onShowTasks ? (
      <Tooltip title="Show their tasks on this board">
        <IconButton
          size="small"
          className="show-tasks"
          aria-label={`Show ${person.fullName}'s tasks`}
          onClick={() => onShowTasks(person)}
          sx={{ opacity: { xs: 1, md: 0.55 }, transition: 'opacity 120ms ease' }}
        >
          <ListFilter size={15} strokeWidth={2} />
        </IconButton>
      </Tooltip>
    ) : null}
  </Stack>
)

export const ScopePeopleBar = ({ title, teams, directory, onShowTasks }) => {
  const [open, setOpen] = useState(null)

  const people = useMemo(() => collectPeople(teams, directory), [teams, directory])
  const workerBreakdown = useMemo(() => breakdownOf(people.worker), [people])

  if (KINDS.every((kind) => people[kind.key].length === 0)) return null

  const show = (anchorEl, kind, designation = null) => setOpen({ anchorEl, kind, designation })
  const listed = open
    ? people[open.kind].filter((person) => !open.designation || person.designation === open.designation)
    : []
  const activeKind = KINDS.find((kind) => kind.key === open?.kind)

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1,
        mb: 1.5,
        p: 1,
        borderRadius: 2.5,
        border: `1px solid ${colors.border}`,
        bgcolor: colors.surface,
      }}
    >
      {KINDS.map((kind) => (
        <CountPill
          key={kind.key}
          kind={kind}
          count={people[kind.key].length}
          onClick={(event) => show(event.currentTarget, kind.key)}
        />
      ))}

      {workerBreakdown.length > 0 ? (
        <>
          <Box sx={{ width: '1px', alignSelf: 'stretch', bgcolor: colors.border, mx: 0.5, display: { xs: 'none', sm: 'block' } }} />
          <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center', flex: 1, minWidth: 0 }}>
            {workerBreakdown.map(([designation, count]) => (
              <ButtonBase
                key={designation}
                onClick={(event) => show(event.currentTarget, 'worker', designation)}
                aria-label={`${count} ${plural(count, designation)}`}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.625,
                  height: 28,
                  px: 1,
                  borderRadius: 999,
                  border: `1px solid ${colors.border}`,
                  bgcolor: colors.page,
                  fontSize: '0.75rem',
                  color: colors.textPrimary,
                  '&:hover': { borderColor: STATUS_TONES.blue.border, bgcolor: STATUS_TONES.blue.soft },
                }}
              >
                <Box component="span" sx={{ fontWeight: 800, color: STATUS_TONES.blue.strong, fontVariantNumeric: 'tabular-nums' }}>
                  {count}
                </Box>
                {plural(count, designation)}
              </ButtonBase>
            ))}
          </Stack>
        </>
      ) : null}

      <Popover
        open={Boolean(open)}
        anchorEl={open?.anchorEl}
        onClose={() => setOpen(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { width: 400, maxWidth: 'calc(100vw - 24px)', borderRadius: 2.5, overflow: 'hidden' } } }}
      >
        {open ? (
          <>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', px: 1.75, pt: 1.25, pb: 0.5 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h4" component="h3" noWrap>
                  {title} · people
                </Typography>
                <Typography variant="caption" component="p" sx={{ color: colors.textSecondary }}>
                  {activeKind.hint}
                </Typography>
              </Box>
              <IconButton size="small" aria-label="Close" onClick={() => setOpen(null)}>
                <X size={14} strokeWidth={2} />
              </IconButton>
            </Stack>

            <Tabs
              value={open.kind}
              onChange={(_, kind) => setOpen((current) => ({ ...current, kind, designation: null }))}
              variant="fullWidth"
              sx={{ minHeight: 40, borderBottom: `1px solid ${colors.border}`, '& .MuiTab-root': { minHeight: 40, fontSize: '0.8125rem' } }}
            >
              {KINDS.map((kind) => (
                <Tab key={kind.key} value={kind.key} label={`${kind.label} ${people[kind.key].length}`} />
              ))}
            </Tabs>

            {open.designation ? (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', px: 1.75, py: 0.75, bgcolor: STATUS_TONES.blue.soft }}>
                <Typography variant="caption" sx={{ flex: 1, color: STATUS_TONES.blue.strong, fontWeight: 600 }}>
                  Showing {listed.length} {plural(listed.length, open.designation)}
                </Typography>
                <ButtonBase
                  onClick={() => setOpen((current) => ({ ...current, designation: null }))}
                  sx={{ fontSize: '0.75rem', fontWeight: 600, color: STATUS_TONES.blue.strong, px: 0.75, borderRadius: 1 }}
                >
                  Show all
                </ButtonBase>
              </Stack>
            ) : null}

            <Box sx={{ maxHeight: 360, overflowY: 'auto' }}>
              {listed.length === 0 ? (
                <Typography variant="body2" sx={{ px: 1.75, py: 3, textAlign: 'center', color: colors.textSecondary }}>
                  No {activeKind.label.toLowerCase()} here yet.
                </Typography>
              ) : (
                listed.map((person) => (
                  <PersonRow
                    key={person.id}
                    person={person}
                    onShowTasks={
                      onShowTasks
                        ? (picked) => {
                            setOpen(null)
                            onShowTasks(picked)
                          }
                        : null
                    }
                  />
                ))
              )}
            </Box>
          </>
        ) : null}
      </Popover>
    </Box>
  )
}
