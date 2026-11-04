import { useMemo, useState } from 'react'
import { Box, Button, IconButton, Stack, Typography } from '@mui/material'
import { ArrowRight, ChevronLeft, ChevronRight, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/SectionCard'
import { EmptyState } from '@/components/EmptyState'
import { QueryStateView } from '@/components/QueryStateView'
import { ListSectionSkeleton } from '@/components/Skeletons'
import { dashboardService } from '@/api/dashboardService'
import { dailyTrackerPath } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { colors } from '@/theme/tokens'
import {
  DEFAULT_METRICS,
  buildByPerson,
  buildLookup,
  describeDay,
  filterPeople,
  isIdle,
  isValidDay,
  localDay,
  shiftDay,
  sumRows,
  visibleMetrics,
} from '@/features/tracker/trackerModel'
import { FilterChip, TrackerHelpButton, TrackerPersonTable, TrackerSummary } from '@/features/tracker/TrackerTable'
import { useTrackerColumns } from '@/features/tracker/useTrackerColumns'

export const DailyTrackerCard = ({ workspaceId, workspaceName }) => {
  const today = localDay()
  const [day, setDay] = useState(today)
  const [teamId, setTeamId] = useState('all')
  const [hideIdle, setHideIdle] = useState(false)

  const tracker = useAsync(dashboardService.getTracker, [workspaceId, day, day], { enabled: Boolean(workspaceId) })

  const teams = tracker.data?.teams ?? []
  const people = useMemo(() => filterPeople(tracker.data?.people ?? [], { teamId }), [tracker.data, teamId])
  const rows = useMemo(
    () => buildByPerson(people, tracker.data?.entries ?? [], day, tracker.data?.handling ?? []),
    [people, tracker.data, day],
  )
  const lookup = useMemo(() => buildLookup(tracker.data), [tracker.data])
  const [columns] = useTrackerColumns()
  const capabilities = tracker.data?.capabilities ?? {}
  const picked = visibleMetrics(columns, capabilities)
  const metrics = picked.length ? picked : visibleMetrics(DEFAULT_METRICS, capabilities)
  const totals = useMemo(() => sumRows(rows), [rows])
  const idleCount = rows.filter(isIdle).length
  const shownRows = hideIdle ? rows.filter((row) => !isIdle(row)) : rows

  const label = describeDay(day)
  const isToday = day === today
  const loading = tracker.loading && !tracker.data

  return (
    <SectionCard
      title="Daily task tracker"
      description={`${workspaceName} · what each person was given and finished on the chosen day`}
      accent="blue"
      padded={false}
      action={
        <Stack direction="row" spacing={0.75} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Stack
            direction="row"
            sx={{ alignItems: 'center', border: `1px solid ${colors.border}`, borderRadius: 1.5, bgcolor: colors.surface, overflow: 'hidden' }}
          >
            <IconButton size="small" aria-label="Previous day" onClick={() => setDay((current) => shiftDay(current, -1))} sx={{ borderRadius: 0 }}>
              <ChevronLeft size={16} strokeWidth={2} />
            </IconButton>
            <Box
              component="input"
              type="date"
              aria-label="Tracker date"
              value={day}
              max={today}
              onChange={(event) => isValidDay(event.target.value) && setDay(event.target.value)}
              sx={{
                height: 32,
                px: 1,
                border: 0,
                borderLeft: `1px solid ${colors.border}`,
                borderRight: `1px solid ${colors.border}`,
                bgcolor: colors.surface,
                color: colors.textPrimary,
                font: 'inherit',
                fontSize: '0.8125rem',
                fontWeight: 600,
                outline: 'none',
                '&:focus-visible': { bgcolor: colors.brandSoft },
              }}
            />
            <IconButton
              size="small"
              aria-label="Next day"
              disabled={day >= today}
              onClick={() => setDay((current) => shiftDay(current, 1))}
              sx={{ borderRadius: 0 }}
            >
              <ChevronRight size={16} strokeWidth={2} />
            </IconButton>
          </Stack>
          <Button size="small" variant="outlined" disabled={isToday} onClick={() => setDay(today)}>
            Today
          </Button>
          <TrackerHelpButton metrics={metrics} />
          <Button
            component={Link}
            to={dailyTrackerPath({ workspace: workspaceId, date: isToday ? '' : day })}
            size="small"
            variant="contained"
            endIcon={<ArrowRight size={14} strokeWidth={2} />}
          >
            Open full tracker
          </Button>
        </Stack>
      }
    >
      <QueryStateView error={tracker.error} onRetry={tracker.reload}>
        {loading ? (
          <Box sx={{ p: 2 }}>
            <ListSectionSkeleton rows={5} wide />
          </Box>
        ) : (tracker.data?.people ?? []).length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="No team members yet"
            description="Add people to teams in this workspace and their daily counts will show up here."
          />
        ) : (
          <>
            <TrackerSummary
              totals={totals}
              headline={
                <>
                  <Typography sx={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {label.dayOfMonth}
                  </Typography>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, lineHeight: 1.2, whiteSpace: 'nowrap' }}>{label.weekday}</Typography>
                    <Typography sx={{ fontSize: '0.75rem', opacity: 0.85, whiteSpace: 'nowrap' }}>
                      {label.monthYear}
                      {isToday ? ' · Today' : ''}
                    </Typography>
                  </Box>
                </>
              }
            />

            <Stack
              direction="row"
              spacing={0.75}
              useFlexGap
              sx={{ px: 1.75, py: 1.25, alignItems: 'center', flexWrap: 'wrap', borderBottom: `1px solid ${colors.border}` }}
            >
              {teams.length > 1 ? (
                <>
                  <FilterChip selected={teamId === 'all'} onClick={() => setTeamId('all')}>
                    All teams
                  </FilterChip>
                  {teams.map((team) => (
                    <FilterChip key={team.id} selected={teamId === team.id} onClick={() => setTeamId(team.id)}>
                      {team.name}
                    </FilterChip>
                  ))}
                </>
              ) : null}
              <Box sx={{ flex: 1 }} />
              {idleCount > 0 ? (
                <FilterChip selected={hideIdle} onClick={() => setHideIdle((current) => !current)}>
                  {hideIdle ? `Show idle (${idleCount})` : `Hide idle (${idleCount})`}
                </FilterChip>
              ) : null}
            </Stack>

            {shownRows.length === 0 ? (
              <EmptyState
                icon={UsersRound}
                title="No one worked on this day"
                description={`Nothing was assigned or completed on ${label.weekday}, ${label.medium}.`}
              />
            ) : (
              <TrackerPersonTable
                rows={shownRows}
                totals={hideIdle ? sumRows(shownRows) : totals}
                metrics={metrics}
                lookup={lookup}
                context={`${label.weekday.slice(0, 3)}, ${label.medium}`}
              />
            )}
          </>
        )}
      </QueryStateView>
    </SectionCard>
  )
}
