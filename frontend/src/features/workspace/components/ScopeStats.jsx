import { Box } from '@mui/material'
import { CircleCheck, ClipboardList, Gauge, RefreshCcw, TriangleAlert, Users } from 'lucide-react'
import { StatCard } from '@/components/StatCard'
import { StatTileSkeleton } from '@/components/Skeletons'

const peopleHint = (summary) => {
  if (summary.scope === 'workspace') return `${summary.counts.groups} groups · ${summary.counts.teams} teams`
  if (summary.scope === 'group') return `${summary.counts.teams} teams · lead ${summary.lead?.fullName ?? '—'}`
  return `Lead ${summary.lead?.fullName ?? '—'}`
}

/** The dashboard's count tiles, scoped to whatever the work page is showing. */
export const ScopeStats = ({ summary, loading, showPoints = true }) => {
  const tiles = showPoints ? 6 : 5
  const grid = {
    display: 'grid',
    gap: 1.25,
    mb: 1.5,
    gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: `repeat(${tiles}, 1fr)` },
  }

  if (loading || !summary) {
    return (
      <Box sx={grid}>
        {Array.from({ length: tiles }, (_, index) => (
          <StatTileSkeleton key={index} />
        ))}
      </Box>
    )
  }

  return (
    <Box sx={grid}>
      <StatCard dense label="Tasks" value={summary.tasks} helperText={`${summary.open} open`} icon={ClipboardList} tone="blue" />
      <StatCard dense label="People" value={summary.counts.members} helperText={peopleHint(summary)} icon={Users} tone="violet" />
      <StatCard
        dense
        label="Completed"
        value={`${summary.completionRate}%`}
        helperText={`${summary.completed} of ${summary.tasks} tasks`}
        icon={CircleCheck}
        tone="teal"
        progress={summary.completionRate}
      />
      <StatCard
        dense
        label="In correction"
        value={summary.inCorrection}
        helperText={`${summary.correctionMoves} rework moves`}
        icon={RefreshCcw}
        tone={summary.inCorrection ? 'rose' : 'teal'}
        emphasis={summary.inCorrection > 0}
      />
      <StatCard
        dense
        label="Overdue"
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
          value={`${summary.completedPoints}/${summary.points}`}
          helperText="earned of planned"
          icon={Gauge}
          tone="orange"
          progress={summary.points ? (summary.completedPoints / summary.points) * 100 : 0}
        />
      ) : null}
    </Box>
  )
}
