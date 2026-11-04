import { Box, Button, Card, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Rows3, UsersRound } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { QueryStateView } from '@/components/QueryStateView'
import { ListSectionSkeleton } from '@/components/Skeletons'
import { dashboardService } from '@/api/dashboardService'
import { ROUTES } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { useWorkspace } from '@/hooks/useWorkspace'
import { colors } from '@/theme/tokens'
import {
  DEFAULT_METRICS,
  MAX_RANGE_DAYS,
  PERIOD_MODES,
  buildByDay,
  buildByPerson,
  buildLookup,
  buildExportDetails,
  buildExportTable,
  clampToToday,
  describeDay,
  filterPeople,
  isIdle,
  isValidDay,
  localDay,
  periodFor,
  periodLabel,
  shiftAnchor,
  spanInDays,
  overline,
  sumRows,
  visibleMetrics,
} from './trackerModel'
import { FilterChip, TrackerDayTable, TrackerHelpButton, TrackerPersonTable, TrackerSummary } from './TrackerTable'
import { TrackerColumnPicker } from './TrackerColumnPicker'
import { TrackerExportMenu } from './TrackerExportMenu'
import { useTrackerColumns } from './useTrackerColumns'

const JUMP_LABEL = { day: 'Today', week: 'This week', month: 'This month' }

const dateInputSx = {
  height: 36,
  px: 1.25,
  border: `1px solid ${colors.border}`,
  borderRadius: 1.5,
  bgcolor: colors.surface,
  color: colors.textPrimary,
  font: 'inherit',
  fontSize: '0.8125rem',
  fontWeight: 600,
  outline: 'none',
  '&:focus-visible': { borderColor: colors.brand, bgcolor: colors.brandSoft },
}

const Segmented = ({ options, value, onChange, label }) => (
  <Stack
    direction="row"
    role="group"
    aria-label={label}
    sx={{ p: 0.375, gap: 0.25, borderRadius: 2, bgcolor: colors.neutralSoft, border: `1px solid ${colors.border}`, width: 'fit-content', maxWidth: '100%', overflowX: 'auto' }}
  >
    {options.map((option) => {
      const selected = option.key === value
      return (
        <Box
          key={option.key}
          component="button"
          type="button"
          aria-pressed={selected}
          onClick={() => onChange(option.key)}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.625,
            height: 30,
            px: 1.5,
            border: 0,
            borderRadius: 1.5,
            bgcolor: selected ? colors.surface : 'transparent',
            boxShadow: selected ? '0 1px 2px rgba(15, 23, 42, 0.12)' : 'none',
            color: selected ? colors.brand : colors.textSecondary,
            font: 'inherit',
            fontSize: '0.8125rem',
            fontWeight: selected ? 700 : 500,
            whiteSpace: 'nowrap',
            cursor: 'pointer',
          }}
        >
          {option.icon ? <option.icon size={14} strokeWidth={2} aria-hidden="true" /> : null}
          {option.label}
        </Box>
      )
    })}
  </Stack>
)

export const DailyTrackerPage = () => {
  const { workspaces, activeWorkspaceId } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const [columns, setColumns] = useTrackerColumns()
  const today = localDay()

  const workspaceId = params.get('workspace') || activeWorkspaceId
  const workspace = workspaces.find((item) => item.id === workspaceId) ?? null
  const mode = PERIOD_MODES.some((item) => item.key === params.get('mode')) ? params.get('mode') : 'day'
  const requested = params.get('date')
  const anchor = isValidDay(requested) && requested <= today ? requested : today
  const groupId = params.get('group') || 'all'
  const teamId = params.get('team') || 'all'
  const hideIdle = params.get('idle') === 'hide'
  const view = mode !== 'day' && params.get('view') === 'day' ? 'day' : 'person'

  const period = clampToToday(periodFor(mode, anchor, { from: params.get('from'), to: params.get('to') }), today)
  const span = spanInDays(period.from, period.to)
  const tooLong = span > MAX_RANGE_DAYS

  const update = (changes) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        Object.entries(changes).forEach(([key, value]) => {
          if (value === null || value === undefined || value === '' || value === 'all') next.delete(key)
          else next.set(key, value)
        })
        return next
      },
      { replace: true },
    )

  const tracker = useAsync(dashboardService.getTracker, [workspaceId, period.from, period.to], {
    enabled: Boolean(workspaceId) && !tooLong,
  })

  const groups = tracker.data?.groups ?? []
  const teams = tracker.data?.teams ?? []
  const visibleTeams = groupId === 'all' ? teams : teams.filter((team) => team.groupId === groupId)

  const people = filterPeople(tracker.data?.people ?? [], { groupId, teamId })
  const entries = tracker.data?.entries ?? []
  const handling = tracker.data?.handling ?? []
  const personRows = buildByPerson(people, entries, period.to, handling)
  const days = buildByDay(people, entries, handling)
  const totals = sumRows(personRows)
  const lookup = buildLookup(tracker.data)

  const capabilities = tracker.data?.capabilities ?? {}
  const picked = visibleMetrics(columns, capabilities)
  const metrics = picked.length ? picked : visibleMetrics(DEFAULT_METRICS, capabilities)

  const idleCount = personRows.filter(isIdle).length
  const shownRows = hideIdle ? personRows.filter((row) => !isIdle(row)) : personRows

  const nextAnchor = shiftAnchor(mode, anchor, 1)
  const canGoNext = periodFor(mode, nextAnchor).from <= today
  const atCurrent = periodFor(mode, today).from === periodFor(mode, anchor).from
  const label = periodLabel(mode, period)
  const loading = tracker.loading && !tracker.data

  const changeMode = (nextMode) => {
    if (nextMode === 'custom') update({ mode: nextMode, from: period.from, to: period.to })
    else update({ mode: nextMode === 'day' ? null : nextMode, from: null, to: null, view: nextMode === 'day' ? null : params.get('view') })
  }

  const changeGroup = (nextGroup) => {
    const keepTeam = teamId !== 'all' && teams.some((team) => team.id === teamId && (nextGroup === 'all' || team.groupId === nextGroup))
    update({ group: nextGroup, team: keepTeam ? teamId : null })
  }

  const prepareExport = () => {
    const scope = scopeName || workspace?.name || 'Team'
    const exportTotals = hideIdle && view === 'person' ? sumRows(shownRows) : totals
    return {
      table: buildExportTable({ view, rows: shownRows, days, totals: exportTotals, period, metrics, lookup }),
      details: buildExportDetails(shownRows, metrics, lookup),
      title: `${scope} - Daily Task Tracker`,
      subtitle: [
        workspace?.name,
        label,
        view === 'day' ? 'Day by day' : 'By person',
        `Exported ${new Date().toLocaleString()}`,
      ]
        .filter(Boolean)
        .join(' · '),
      filename: `daily-tracker-${scope.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${period.from}${period.from === period.to ? '' : `_${period.to}`}`,
    }
  }

  const single = describeDay(period.from)
  const headline =
    period.from === period.to ? (
      <>
        <Typography sx={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{single.dayOfMonth}</Typography>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, lineHeight: 1.2, whiteSpace: 'nowrap' }}>{single.weekday}</Typography>
          <Typography sx={{ fontSize: '0.75rem', opacity: 0.85, whiteSpace: 'nowrap' }}>
            {single.monthYear}
            {period.from === today ? ' · Today' : ''}
          </Typography>
        </Box>
      </>
    ) : (
      <>
        <CalendarRange size={26} strokeWidth={1.75} aria-hidden="true" />
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, lineHeight: 1.2 }}>{label}</Typography>
          <Typography sx={{ fontSize: '0.75rem', opacity: 0.85, whiteSpace: 'nowrap' }}>
            {span} days{period.to === today ? ' · up to today' : ''}
          </Typography>
        </Box>
      </>
    )

  const scopeName = [
    groupId !== 'all' ? groups.find((group) => group.id === groupId)?.name : null,
    teamId !== 'all' ? teams.find((team) => team.id === teamId)?.name : null,
  ]
    .filter(Boolean)
    .join(' › ')

  return (
    <Box>
      <PageHeader
        title="Daily task tracker"
        description={`${workspace?.name ?? 'Workspace'} · what each person was given and finished — by day, week or month`}
        breadcrumbs={[{ label: 'Dashboard', to: ROUTES.dashboard }, { label: 'Daily task tracker' }]}
        actions={
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <TrackerHelpButton metrics={metrics} />
            <TrackerColumnPicker selected={columns} onChange={setColumns} capabilities={capabilities} />
            <TrackerExportMenu disabled={!tracker.data || personRows.length === 0} prepare={prepareExport} />
          </Stack>
        }
      />

      <Card sx={{ mb: 1.5 }}>
        <Stack spacing={1.5} sx={{ p: { xs: 1.5, md: 2 } }}>
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            spacing={1.5}
            useFlexGap
            sx={{ alignItems: { xs: 'stretch', lg: 'center' }, flexWrap: 'wrap' }}
          >
            <Segmented label="Period" options={PERIOD_MODES} value={mode} onChange={changeMode} />

            {mode === 'custom' ? (
              <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Box
                  component="input"
                  type="date"
                  aria-label="From date"
                  value={period.from}
                  max={today}
                  onChange={(event) => isValidDay(event.target.value) && update({ from: event.target.value, to: event.target.value > period.to ? event.target.value : period.to })}
                  sx={dateInputSx}
                />
                <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                  to
                </Typography>
                <Box
                  component="input"
                  type="date"
                  aria-label="To date"
                  value={period.to}
                  min={period.from}
                  max={today}
                  onChange={(event) => isValidDay(event.target.value) && update({ to: event.target.value })}
                  sx={dateInputSx}
                />
              </Stack>
            ) : (
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <IconButton size="small" aria-label="Previous period" onClick={() => update({ date: shiftAnchor(mode, anchor, -1) })} sx={{ border: `1px solid ${colors.border}`, borderRadius: 1.5 }}>
                  <ChevronLeft size={16} strokeWidth={2} />
                </IconButton>
                {mode === 'day' ? (
                  <Box
                    component="input"
                    type="date"
                    aria-label="Tracker date"
                    value={anchor}
                    max={today}
                    onChange={(event) => isValidDay(event.target.value) && update({ date: event.target.value })}
                    sx={dateInputSx}
                  />
                ) : (
                  <Box sx={{ ...dateInputSx, display: 'inline-flex', alignItems: 'center', minWidth: 180, justifyContent: 'center' }}>{label}</Box>
                )}
                <IconButton
                  size="small"
                  aria-label="Next period"
                  disabled={!canGoNext}
                  onClick={() => update({ date: nextAnchor })}
                  sx={{ border: `1px solid ${colors.border}`, borderRadius: 1.5 }}
                >
                  <ChevronRight size={16} strokeWidth={2} />
                </IconButton>
                <Button size="small" variant="outlined" disabled={atCurrent} onClick={() => update({ date: null })}>
                  {JUMP_LABEL[mode]}
                </Button>
              </Stack>
            )}
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gap: 1.25,
              gridTemplateColumns: {
                xs: 'minmax(0, 1fr)',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: workspaces.length > 1 ? 'repeat(3, minmax(0, 260px))' : 'repeat(2, minmax(0, 260px))',
              },
            }}
          >
            {workspaces.length > 1 ? (
              <TextField
                select
                size="small"
                label="Workspace"
                value={workspaceId ?? ''}
                onChange={(event) => update({ workspace: event.target.value, group: null, team: null })}
              >
                {workspaces.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
            <TextField select size="small" label="Group" value={groupId} onChange={(event) => changeGroup(event.target.value)}>
              <MenuItem value="all">All groups</MenuItem>
              {groups.map((group) => (
                <MenuItem key={group.id} value={group.id}>
                  {group.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField select size="small" label="Team" value={teamId} onChange={(event) => update({ team: event.target.value })}>
              <MenuItem value="all">{groupId === 'all' ? 'All teams' : 'All teams in this group'}</MenuItem>
              {visibleTeams.map((team) => (
                <MenuItem key={team.id} value={team.id}>
                  {team.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </Stack>
      </Card>

      <Card>
        {tooLong ? (
          <EmptyState icon={CalendarRange} title="That range is too long" description={`Pick ${MAX_RANGE_DAYS} days or fewer.`} />
        ) : (
          <QueryStateView error={tracker.error} onRetry={tracker.reload}>
            {loading ? (
              <Box sx={{ p: 2 }}>
                <ListSectionSkeleton rows={6} wide />
              </Box>
            ) : (tracker.data?.people ?? []).length === 0 ? (
              <EmptyState
                icon={UsersRound}
                title="No team members yet"
                description="Add people to teams in this workspace and their counts will show up here."
              />
            ) : (
              <>
                <TrackerSummary headline={headline} totals={totals} />

                <Stack
                  direction="row"
                  spacing={0.75}
                  useFlexGap
                  sx={{ px: 1.75, py: 1.25, alignItems: 'center', flexWrap: 'wrap', borderBottom: `1px solid ${colors.border}` }}
                >
                  {mode !== 'day' ? (
                    <Segmented
                      label="Layout"
                      value={view}
                      onChange={(next) => update({ view: next === 'day' ? 'day' : null })}
                      options={[
                        { key: 'person', label: 'By person', icon: UsersRound },
                        { key: 'day', label: 'Day by day', icon: Rows3 },
                      ]}
                    />
                  ) : null}
                  <Typography sx={{ ...overline, ml: mode !== 'day' ? 0.5 : 0 }}>
                    {scopeName || 'All groups and teams'} · {people.length} people
                  </Typography>
                  <Box sx={{ flex: 1 }} />
                  {view === 'person' && idleCount > 0 ? (
                    <FilterChip selected={hideIdle} onClick={() => update({ idle: hideIdle ? null : 'hide' })}>
                      {hideIdle ? `Show idle (${idleCount})` : `Hide idle (${idleCount})`}
                    </FilterChip>
                  ) : null}
                </Stack>

                {people.length === 0 ? (
                  <EmptyState icon={UsersRound} title="No one in this group or team" description="Pick another group or team above." />
                ) : view === 'day' ? (
                  days.length === 0 ? (
                    <EmptyState icon={CalendarDays} title="No work logged" description={`Nothing was assigned or completed in ${label}.`} />
                  ) : (
                    <TrackerDayTable days={days} totals={totals} metrics={metrics} lookup={lookup} />
                  )
                ) : shownRows.length === 0 ? (
                  <EmptyState icon={CalendarDays} title="No one worked in this period" description={`Nothing was assigned or completed in ${label}.`} />
                ) : (
                  <TrackerPersonTable
                    rows={shownRows}
                    totals={hideIdle ? sumRows(shownRows) : totals}
                    metrics={metrics}
                    lookup={lookup}
                    context={label}
                  />
                )}
              </>
            )}
          </QueryStateView>
        )}
      </Card>
    </Box>
  )
}
