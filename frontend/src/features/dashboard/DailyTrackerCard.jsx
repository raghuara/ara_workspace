import { useMemo, useState } from 'react'
import { Alert, Box, Button, IconButton, Popover, Stack, Tooltip, Typography } from '@mui/material'
import { CalendarDays, Download, Info, Users, X } from 'lucide-react'
import { SectionCard } from '@/components/SectionCard'
import { EmptyState } from '@/components/EmptyState'
import { MonthPicker } from '@/components/MonthPicker'
import { QueryStateView } from '@/components/QueryStateView'
import { ListSectionSkeleton } from '@/components/Skeletons'
import { UserAvatar } from '@/components/UserAvatar'
import { dashboardService } from '@/api/dashboardService'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { useAsync } from '@/hooks/useAsync'
import { usePeriod } from '@/hooks/usePeriod'
import { colors } from '@/theme/tokens'
import { saveBlob } from '@/api/httpClient'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const ROW_COLUMNS = { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) repeat(4, 58px) 132px' }
const METRICS = [
  { key: 'assigned', label: 'New', tone: 'blue' },
  { key: 'corrections', label: 'Corrections', short: 'Corr', tone: 'rose' },
  { key: 'completed', label: 'Done', tone: 'green' },
  { key: 'inProgress', label: 'Open', tone: 'amber' },
]

const overline = {
  fontSize: '0.625rem',
  fontWeight: 700,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  color: colors.textSecondary,
}

const localDay = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const dayLabel = (key) => {
  const date = new Date(`${key}T00:00:00`)
  return {
    date: `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`,
    short: `${String(date.getDate()).padStart(2, '0')}-${MONTHS[date.getMonth()]}-${date.getFullYear()}`,
    weekday: WEEKDAYS[date.getDay()],
    weekend: date.getDay() === 0 || date.getDay() === 6,
  }
}

const daysBetween = (from, to) => {
  const days = []
  const start = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T00:00:00`)
  for (let cursor = start; cursor <= end; cursor.setDate(cursor.getDate() + 1)) days.push(localDay(cursor))
  return days
}

const rateTone = (percent) => (percent >= 80 ? 'green' : percent >= 50 ? 'amber' : 'rose')

const buildRows = ({ tasks, moves, correctionNames, people, days }) => {
  const assignedOn = new Map()
  const completedOn = new Map()
  const correctedOn = new Map()
  const openAt = new Map()

  const bump = (store, day, personId, by = 1) => {
    const key = `${day}|${personId}`
    store.set(key, (store.get(key) ?? 0) + by)
  }

  const taskById = new Map(tasks.map((task) => [task.id, task]))

  tasks.forEach((task) => {
    task.assignees.forEach((person) => {
      if (task.createdAt) bump(assignedOn, task.createdAt, person.id)
      if (task.completedAt) bump(completedOn, task.completedAt, person.id)

      days.forEach((day) => {
        const started = task.createdAt && task.createdAt <= day
        const finished = task.completedAt && task.completedAt <= day
        if (started && !finished) bump(openAt, day, person.id)
      })
    })
  })

  moves.forEach((entry) => {
    const to = entry.detail?.to
    if (!to || !correctionNames.has(to)) return
    const day = String(entry.at ?? '').slice(0, 10)
    const task = taskById.get(entry.taskId)
    if (!day || !task) return
    task.assignees.forEach((person) => bump(correctedOn, day, person.id))
  })

  return days
    .map((day) => {
      const rows = people
        .map((person) => {
          const key = `${day}|${person.id}`
          const assigned = assignedOn.get(key) ?? 0
          const corrections = correctedOn.get(key) ?? 0
          const completed = completedOn.get(key) ?? 0
          const inProgress = openAt.get(key) ?? 0
          const total = assigned + corrections

          return {
            person,
            assigned,
            corrections,
            total,
            completed,
            inProgress,
            percent: total ? Math.round((completed / total) * 1000) / 10 : null,
          }
        })
        .filter((row) => row.total > 0 || row.completed > 0 || row.inProgress > 0)
        .sort(
          (a, b) => b.total - a.total || b.completed - a.completed || a.person.fullName.localeCompare(b.person.fullName),
        )

      const totals = rows.reduce(
        (sum, row) => ({
          assigned: sum.assigned + row.assigned,
          corrections: sum.corrections + row.corrections,
          completed: sum.completed + row.completed,
          inProgress: sum.inProgress + row.inProgress,
          total: sum.total + row.total,
        }),
        { assigned: 0, corrections: 0, completed: 0, inProgress: 0, total: 0 },
      )

      return {
        day,
        ...dayLabel(day),
        rows,
        totals: { ...totals, percent: totals.total ? Math.round((totals.completed / totals.total) * 100) : null },
      }
    })
    .filter((group) => group.rows.length > 0)
    .reverse()
}

const byPersonFrom = (groups) => {
  const people = new Map()

  groups.forEach((group) =>
    group.rows.forEach((row) => {
      const current = people.get(row.person.id) ?? {
        person: row.person,
        assigned: 0,
        corrections: 0,
        completed: 0,
        total: 0,
        inProgress: 0,
        days: 0,
      }
      current.assigned += row.assigned
      current.corrections += row.corrections
      current.completed += row.completed
      current.total += row.total
      current.inProgress = row.inProgress
      current.days += row.total > 0 || row.completed > 0 ? 1 : 0
      people.set(row.person.id, current)
    }),
  )

  return [...people.values()]
    .map((person) => ({
      ...person,
      percent: person.total ? Math.round((person.completed / person.total) * 1000) / 10 : null,
    }))
    .sort((a, b) => b.completed - a.completed || b.total - a.total)
}

const toCsv = (groups, workspaceName) => {
  const header = [
    'Date',
    'Day',
    'Team member',
    'Role',
    'New assigned',
    'Corrections assigned',
    'Total assigned',
    'Completed',
    'In progress (EOD)',
    'Completion %',
    'Workspace',
  ]
  const lines = groups.flatMap((group) =>
    group.rows.map((row) =>
      [
        group.short,
        group.weekday,
        row.person.fullName,
        row.person.role,
        row.assigned,
        row.corrections,
        row.total,
        row.completed,
        row.inProgress,
        row.percent === null ? '' : `${row.percent}%`,
        workspaceName,
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(','),
    ),
  )
  return [header.join(','), ...lines].join('\n')
}

const CompletionBar = ({ percent, width = '100%' }) => {
  if (percent === null) {
    return (
      <Typography variant="caption" sx={{ color: colors.textSecondary }}>
        —
      </Typography>
    )
  }
  const tone = STATUS_TONES[rateTone(percent)]

  return (
    <Stack direction="row" spacing={0.875} sx={{ alignItems: 'center', width, minWidth: 0 }}>
      <Box sx={{ flex: 1, minWidth: 0, height: 6, borderRadius: 999, bgcolor: colors.neutralSoft, overflow: 'hidden' }}>
        <Box
          sx={{
            width: `${Math.min(100, percent)}%`,
            height: '100%',
            borderRadius: 999,
            bgcolor: tone.strong,
            transition: 'width 320ms ease',
          }}
        />
      </Box>
      <Typography
        variant="caption"
        sx={{ width: 42, textAlign: 'right', fontWeight: 700, color: tone.strong, fontVariantNumeric: 'tabular-nums' }}
      >
        {percent}%
      </Typography>
    </Stack>
  )
}

const MetricCell = ({ metric, value }) => {
  const tone = STATUS_TONES[metric.tone]
  const active = value > 0

  return (
    <Stack
      direction="row"
      spacing={0.5}
      sx={{
        alignItems: 'center',
        justifyContent: { xs: 'flex-start', md: 'flex-end' },
        px: { xs: 0.875, md: 0 },
        py: { xs: 0.25, md: 0 },
        borderRadius: { xs: 999, md: 0 },
        bgcolor: { xs: active ? tone.soft : colors.neutralSoft, md: 'transparent' },
      }}
    >
      <Typography component="span" sx={{ ...overline, display: { md: 'none' }, color: active ? tone.strong : 'inherit' }}>
        {metric.short ?? metric.label}
      </Typography>
      <Typography
        component="span"
        sx={{
          fontSize: '0.8125rem',
          fontWeight: active ? 700 : 400,
          color: active ? tone.strong : colors.textSecondary,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </Typography>
    </Stack>
  )
}

const PersonRow = ({ row, accent }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: ROW_COLUMNS,
      alignItems: 'center',
      gap: { xs: 0.75, md: 1 },
      px: 1.75,
      py: 1,
      borderLeft: `3px solid ${accent}`,
      borderBottom: `1px solid ${colors.border}`,
      transition: 'background-color 120ms ease',
      '&:last-of-type': { borderBottom: 0 },
      '&:hover': { bgcolor: colors.page },
    }}
  >
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
      <UserAvatar name={row.person.fullName} size={30} />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
          {row.person.fullName}
        </Typography>
        <Typography variant="caption" component="p" noWrap>
          {row.person.role}
        </Typography>
      </Box>
    </Stack>

    <Box sx={{ display: { xs: 'flex', md: 'contents' }, gap: 0.625, flexWrap: 'wrap' }}>
      {METRICS.map((metric) => (
        <MetricCell key={metric.key} metric={metric} value={row[metric.key]} />
      ))}
    </Box>

    <CompletionBar percent={row.percent} />
  </Box>
)

export const DailyTrackerCard = ({ workspaceId, workspaceName }) => {
  const { range, periodLabel } = usePeriod()
  const [help, setHelp] = useState(null)
  const [view, setView] = useState('day')

  const workspaceIds = useMemo(() => [workspaceId], [workspaceId])
  const taskArgs = useMemo(() => ({ ...range }), [range])
  const moveArgs = useMemo(() => ({ workspaceId, action: 'moved', ...range }), [workspaceId, range])
  const summaryArgs = useMemo(() => ({ ...range }), [range])

  const tasks = useAsync(dashboardService.collectTasks, [workspaceIds, taskArgs], { enabled: Boolean(workspaceId) })
  const moves = useAsync(dashboardService.collectActivity, [moveArgs], { enabled: Boolean(workspaceId) })
  const summary = useAsync(dashboardService.getScopeSummary, [workspaceId, summaryArgs], {
    enabled: Boolean(workspaceId),
  })

  const groups = useMemo(() => {
    const list = tasks.data ?? []
    if (list.length === 0) return []

    const today = localDay()
    const lastDay = range.to < today ? range.to : today
    if (range.from > lastDay) return []

    const correctionNames = new Set(
      list.filter((task) => task.statusKind === 'correction').map((task) => task.statusName),
    )

    const byId = new Map()
    list.forEach((task) =>
      task.assignees.forEach((person) => {
        if (!byId.has(person.id)) byId.set(person.id, { id: person.id, fullName: person.fullName, role: '—' })
      }),
    )
    ;(summary.data?.members ?? []).forEach((member) => {
      const person = byId.get(member.id)
      if (person) person.role = member.designation && member.designation !== '—' ? member.designation : member.role
    })

    return buildRows({
      tasks: list,
      moves: moves.data?.items ?? [],
      correctionNames,
      people: [...byId.values()],
      days: daysBetween(range.from, lastDay),
    })
  }, [tasks.data, moves.data, summary.data, range])

  const people = useMemo(() => byPersonFrom(groups), [groups])

  const totals = groups.reduce(
    (sum, group) => ({
      assigned: sum.assigned + group.totals.assigned,
      corrections: sum.corrections + group.totals.corrections,
      completed: sum.completed + group.totals.completed,
      total: sum.total + group.totals.total,
    }),
    { assigned: 0, corrections: 0, completed: 0, total: 0 },
  )
  const overall = totals.total ? Math.round((totals.completed / totals.total) * 100) : null

  const loading = tasks.loading && !tasks.data

  const download = () => {
    const csv = toCsv(groups, workspaceName)
    saveBlob(
      new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
      `daily-tracker-${periodLabel.replace(/\s+/g, '-')}.csv`,
    )
  }

  const summaryTiles = [
    { label: 'New', value: totals.assigned, tone: 'blue' },
    { label: 'Corrections', value: totals.corrections, tone: 'rose' },
    { label: 'Completed', value: totals.completed, tone: 'green' },
    { label: 'Completion', value: overall === null ? '—' : `${overall}%`, tone: overall === null ? 'slate' : rateTone(overall) },
  ]

  return (
    <SectionCard
      title="Daily task tracker"
      description={`${workspaceName} · what each person picked up and finished, day by day`}
      accent="blue"
      padded={false}
      action={
        <Stack direction="row" spacing={0.75} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Tooltip title="How these columns are counted">
            <IconButton
              size="small"
              aria-label="How these columns are counted"
              onClick={(event) => setHelp(event.currentTarget)}
            >
              <Info size={15} strokeWidth={1.75} />
            </IconButton>
          </Tooltip>
          <MonthPicker />
          <Button
            size="small"
            variant="outlined"
            onClick={download}
            disabled={groups.length === 0}
            startIcon={<Download size={14} strokeWidth={2} />}
          >
            CSV
          </Button>
        </Stack>
      }
    >
      <Popover
        open={Boolean(help)}
        anchorEl={help}
        onClose={() => setHelp(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 340, maxWidth: 'calc(100vw - 24px)', p: 2, borderRadius: 2.5 } } }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
          <Typography variant="h4" component="h3" sx={{ flex: 1 }}>
            How this is counted
          </Typography>
          <IconButton size="small" aria-label="Close" onClick={() => setHelp(null)}>
            <X size={14} strokeWidth={2} />
          </IconButton>
        </Stack>
        <Stack spacing={0.875}>
          {[
            ['New', 'Tasks created that day, counted for each person assigned to them.'],
            ['Corrections', 'Tasks moved into a Correction group that day, counted for their assignees.'],
            ['Done', 'Tasks marked complete that day.'],
            ['Open', 'Still open at the end of that day: started on or before it, not yet finished.'],
            ['Completion', 'Done ÷ (new + corrections) for that day.'],
          ].map(([label, text]) => (
            <Box key={label}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {label}
              </Typography>
              <Typography variant="caption" component="p">
                {text}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Popover>

      <QueryStateView error={tasks.error} onRetry={tasks.reload}>
        {loading ? (
          <Box sx={{ p: 2 }}>
            <ListSectionSkeleton rows={5} wide />
          </Box>
        ) : groups.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nothing logged in this period"
            description={`No tasks were created, finished or sent back in ${periodLabel}.`}
          />
        ) : (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' },
                gap: 1,
                px: 1.75,
                py: 1.5,
                borderBottom: `1px solid ${colors.border}`,
              }}
            >
              {summaryTiles.map((tile) => {
                const tone = STATUS_TONES[tile.tone]
                return (
                  <Box
                    key={tile.label}
                    sx={{
                      px: 1.25,
                      py: 0.875,
                      borderRadius: 2,
                      bgcolor: tone.soft,
                      border: `1px solid ${tone.border}`,
                      minWidth: 0,
                    }}
                  >
                    <Typography component="p" noWrap sx={{ ...overline, color: tone.strong }}>
                      {tile.label}
                    </Typography>
                    <Typography
                      component="p"
                      sx={{ fontSize: '1.125rem', fontWeight: 700, lineHeight: 1.3, fontVariantNumeric: 'tabular-nums' }}
                    >
                      {tile.value}
                    </Typography>
                  </Box>
                )
              })}
            </Box>

            <Stack
              direction="row"
              spacing={0.75}
              useFlexGap
              sx={{ px: 1.75, py: 1.25, alignItems: 'center', flexWrap: 'wrap', borderBottom: `1px solid ${colors.border}` }}
            >
              {[
                { key: 'day', label: 'By day', icon: CalendarDays },
                { key: 'person', label: 'By person', icon: Users },
              ].map((option) => {
                const selected = view === option.key
                return (
                  <Box
                    key={option.key}
                    component="button"
                    type="button"
                    onClick={() => setView(option.key)}
                    aria-pressed={selected}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.625,
                      height: 30,
                      px: 1.25,
                      border: `1px solid ${selected ? colors.brand : colors.border}`,
                      borderRadius: 999,
                      bgcolor: selected ? colors.brand : colors.surface,
                      color: selected ? '#FFFFFF' : colors.textPrimary,
                      font: 'inherit',
                      fontSize: '0.75rem',
                      fontWeight: selected ? 650 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    <option.icon size={13} strokeWidth={2} aria-hidden="true" />
                    {option.label}
                  </Box>
                )
              })}
              <Box sx={{ flex: 1 }} />
              <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                {view === 'day' ? `${groups.length} days with work` : `${people.length} people`} · {periodLabel}
              </Typography>
            </Stack>

            {moves.data?.truncated ? (
              <Alert severity="info" sx={{ mx: 1.75, mt: 1.5 }}>
                This month has a lot of movement, so corrections are counted from the most recent 1,000 moves.
              </Alert>
            ) : null}

            <Box
              sx={{
                display: { xs: 'none', md: 'grid' },
                gridTemplateColumns: ROW_COLUMNS,
                gap: 1,
                px: 1.75,
                py: 0.875,
                pl: 2.125,
                bgcolor: colors.page,
                borderBottom: `1px solid ${colors.border}`,
              }}
            >
              <Typography sx={overline}>{view === 'day' ? 'Team member' : 'Person'}</Typography>
              {METRICS.map((metric) => (
                <Typography key={metric.key} sx={{ ...overline, textAlign: 'right' }}>
                  {metric.label}
                </Typography>
              ))}
              <Typography sx={{ ...overline, textAlign: 'right' }}>Completion</Typography>
            </Box>

            <Box sx={{ maxHeight: 560, overflowY: 'auto' }}>
              {view === 'person'
                ? people.map((row) => (
                    <PersonRow
                      key={row.person.id}
                      row={row}
                      accent={row.percent === 100 ? STATUS_TONES.green.strong : 'transparent'}
                    />
                  ))
                : groups.map((group) => (
                    <Box key={group.day}>
                      <Stack
                        direction="row"
                        spacing={1}
                        useFlexGap
                        sx={{
                          position: 'sticky',
                          top: 0,
                          zIndex: 1,
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          px: 1.75,
                          py: 0.875,
                          bgcolor: group.weekend ? colors.neutralSoft : colors.brandSoft,
                          borderTop: `1px solid ${colors.border}`,
                          borderBottom: `1px solid ${colors.border}`,
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {group.date}
                        </Typography>
                        <Box
                          component="span"
                          sx={{
                            px: 0.75,
                            py: '1px',
                            borderRadius: 999,
                            bgcolor: colors.surface,
                            border: `1px solid ${colors.border}`,
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            color: colors.textSecondary,
                          }}
                        >
                          {group.weekday}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 8 }} />
                        <Typography variant="caption" sx={{ color: colors.textSecondary, whiteSpace: 'nowrap' }}>
                          {group.totals.assigned} new · {group.totals.corrections} corrections · {group.totals.completed} done
                        </Typography>
                        <Box sx={{ width: { xs: '100%', sm: 150 } }}>
                          <CompletionBar percent={group.totals.percent} />
                        </Box>
                      </Stack>

                      {group.rows.map((row) => (
                        <PersonRow
                          key={`${group.day}-${row.person.id}`}
                          row={row}
                          accent={
                            row.percent === 100
                              ? STATUS_TONES.green.strong
                              : row.total > 0 && row.completed === 0
                                ? STATUS_TONES.rose.strong
                                : 'transparent'
                          }
                        />
                      ))}
                    </Box>
                  ))}
            </Box>
          </>
        )}
      </QueryStateView>
    </SectionCard>
  )
}
