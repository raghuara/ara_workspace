import { useId, useState } from 'react'
import { Box, ButtonBase, Collapse, Stack, Typography } from '@mui/material'
import { ChevronDown, CircleCheck, ClipboardList, Gauge, RefreshCcw, TriangleAlert, Users } from 'lucide-react'
import { StatCard } from '@/components/StatCard'
import { StatTileSkeleton } from '@/components/Skeletons'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { colors } from '@/theme/tokens'

const STORAGE_KEY = 'ara.workSummaryOpen'

const readOpen = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

const storeOpen = (open) => {
  try {
    localStorage.setItem(STORAGE_KEY, String(open))
    return true
  } catch {
    return false
  }
}

const peopleHint = (summary) => {
  if (summary.scope === 'workspace') return `${summary.counts.groups} groups · ${summary.counts.teams} teams`

  // Only the people who do the work carry tasks; the rest assign and review.
  const { workers, supervisors } = summary.counts
  if (typeof workers === 'number' && supervisors > 0) return `${workers} doing the work · ${supervisors} overseeing`
  if (summary.scope === 'group') return `${summary.counts.teams} teams · lead ${summary.lead?.fullName ?? '—'}`
  return `Lead ${summary.lead?.fullName ?? '—'}`
}

const Pill = ({ tone, children }) => {
  const palette = STATUS_TONES[tone] ?? STATUS_TONES.slate
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        flexShrink: 0,
        px: 0.875,
        py: 0.125,
        borderRadius: 999,
        bgcolor: palette.soft,
        border: `1px solid ${palette.border}`,
        color: palette.strong,
        fontSize: '0.6875rem',
        fontWeight: 600,
        lineHeight: 1.6,
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Box>
  )
}

export const ScopeStats = ({ summary, loading, showPoints = true, personal: personalView = false, onDrill }) => {
  const [open, setOpen] = useState(readOpen)
  const regionId = useId()
  const personal = personalView || Boolean(summary?.personal)
  const tiles = (showPoints ? 6 : 5) - (personal ? 1 : 0)
  const ready = !loading && Boolean(summary)

  const toggle = () => {
    setOpen(!open)
    storeOpen(!open)
  }

  const grid = {
    display: 'grid',
    gap: 1.25,
    pb: 1.5,
    gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: `repeat(${tiles}, 1fr)` },
  }

  return (
    <Box component="section" aria-label="Summary">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: open ? 1 : 1.5, minHeight: 28 }}>
        <Typography
          component="h2"
          sx={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: colors.textSecondary,
            flexShrink: 0,
          }}
        >
          {personal ? 'My summary' : 'Summary'}
        </Typography>

        {!open && ready ? (
          <Stack
            direction="row"
            spacing={0.625}
            sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', minWidth: 0, overflow: 'hidden' }}
          >
            <Pill tone="blue">
              {summary.tasks} tasks · {summary.open} open
            </Pill>
            <Pill tone="teal">{summary.completionRate}% done</Pill>
            {summary.inCorrection > 0 ? <Pill tone="rose">{summary.inCorrection} in correction</Pill> : null}
            <Pill tone={summary.overdue ? 'amber' : 'teal'}>
              {summary.overdue ? `${summary.overdue} overdue` : 'None overdue'}
            </Pill>
            {showPoints ? (
              <Pill tone="orange">
                {summary.completedPoints}/{summary.points} pts
              </Pill>
            ) : null}
          </Stack>
        ) : null}

        <Box aria-hidden="true" sx={{ flex: 1, minWidth: 24, height: '1px', bgcolor: colors.border }} />

        <ButtonBase
          onClick={toggle}
          aria-expanded={open}
          aria-controls={regionId}
          aria-label={open ? 'Hide summary cards' : 'Show summary cards'}
          sx={{
            flexShrink: 0,
            gap: 0.5,
            height: 28,
            pl: 1,
            pr: 0.75,
            borderRadius: 999,
            border: `1px solid ${colors.border}`,
            bgcolor: colors.surface,
            color: colors.textSecondary,
            fontSize: '0.75rem',
            fontWeight: 600,
            transition: 'background-color 120ms ease, color 120ms ease, border-color 120ms ease',
            '&:hover': { bgcolor: colors.brandSoft, color: colors.brandDark, borderColor: colors.brandTint },
            '&:focus-visible': { outline: 'none', boxShadow: `0 0 0 2px ${colors.surface}, 0 0 0 4px ${colors.brand}` },
          }}
        >
          {open ? 'Hide' : 'Show'}
          <Box
            component="span"
            sx={{ display: 'inline-flex', transition: 'transform 200ms ease', transform: open ? 'rotate(180deg)' : 'none' }}
          >
            <ChevronDown size={15} strokeWidth={2} aria-hidden="true" />
          </Box>
        </ButtonBase>
      </Stack>

      <Collapse in={open} timeout={200} id={regionId}>
        {ready ? (
          <Box sx={grid}>
            <StatCard
              dense
              label={personal ? 'My tasks' : 'Tasks'}
              onClick={onDrill ? () => onDrill('tasks') : undefined}
              value={summary.tasks}
              helperText={`${summary.open} open`}
              icon={ClipboardList}
              tone="blue"
            />
            {personal ? null : (
              <StatCard
                dense
                label="People"
                value={summary.counts.members}
                helperText={peopleHint(summary)}
                icon={Users}
                tone="violet"
                onClick={onDrill ? () => onDrill('people') : undefined}
              />
            )}
            <StatCard
              dense
              label="Completed"
              onClick={onDrill ? () => onDrill('completed') : undefined}
              value={`${summary.completionRate}%`}
              helperText={`${summary.completed} of ${summary.tasks} tasks`}
              icon={CircleCheck}
              tone="teal"
              progress={summary.completionRate}
            />
            <StatCard
              dense
              label="In correction"
              onClick={onDrill ? () => onDrill('correction') : undefined}
              value={summary.inCorrection}
              helperText={`${summary.correctionMoves} rework moves`}
              icon={RefreshCcw}
              tone={summary.inCorrection ? 'rose' : 'teal'}
              emphasis={summary.inCorrection > 0}
            />
            <StatCard
              dense
              label="Overdue"
              onClick={onDrill ? () => onDrill('overdue') : undefined}
              value={summary.overdue}
              helperText={summary.dueToday ? `${summary.dueToday} due today` : summary.overdue ? 'Needs attention' : 'All on track'}
              icon={summary.overdue ? TriangleAlert : CircleCheck}
              tone={summary.overdue ? 'amber' : 'teal'}
              emphasis={summary.overdue > 0}
            />
            {showPoints ? (
              <StatCard
                dense
                label="Points"
                onClick={onDrill ? () => onDrill('points') : undefined}
                value={`${summary.completedPoints}/${summary.points}`}
                helperText="earned of planned"
                icon={Gauge}
                tone="orange"
                progress={summary.points ? (summary.completedPoints / summary.points) * 100 : 0}
              />
            ) : null}
          </Box>
        ) : (
          <Box sx={grid}>
            {Array.from({ length: tiles }, (_, index) => (
              <StatTileSkeleton key={index} />
            ))}
          </Box>
        )}
      </Collapse>
    </Box>
  )
}
