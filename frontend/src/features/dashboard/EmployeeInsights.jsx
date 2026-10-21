import { Box, Typography } from '@mui/material'
import { SectionCard } from '@/components/SectionCard'
import { ToneChip } from '@/components/ToneChip'
import { ColumnChart, DonutChart, ProgressRows } from '@/components/charts/BarChart'
import { colors } from '@/theme/tokens'

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

const MiniStat = ({ label, value, hint }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography
      component="p"
      noWrap
      sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: colors.textSecondary }}
    >
      {label}
    </Typography>
    <Typography component="p" noWrap sx={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.35, fontVariantNumeric: 'tabular-nums' }}>
      {value}
    </Typography>
    {hint ? (
      <Typography variant="caption" component="p" noWrap>
        {hint}
      </Typography>
    ) : null}
  </Box>
)

export const EmployeeInsights = ({ insights, yearLabel }) => (
  <Box
    sx={{
      display: 'grid',
      gap: 1.5,
      gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))', lg: 'minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr)' },
    }}
  >
    <SectionCard
      title="My points by month"
      description={`FY ${yearLabel} · points from completed tasks, average marked`}
      accent="blue"
      action={<ToneChip label={`${insights.totalPoints} pts this year`} tone="blue" />}
      sx={{ gridColumn: { md: '1 / -1', lg: 'auto' } }}
    >
      {insights.byMonth.length === 0 ? (
        <Typography variant="caption">No months to show yet.</Typography>
      ) : (
        <ColumnChart
          ariaLabel={`My completed points each month of FY ${yearLabel}`}
          seriesLabel="Points"
          data={insights.byMonth.map((month) => ({ label: month.label, value: month.points }))}
          height={150}
          maxBarWidth={32}
        />
      )}
    </SectionCard>

    <SectionCard title="My work by status" description={`${plural(insights.total, 'task')} · FY ${yearLabel}`} accent="violet">
      {insights.statusSegments.length === 0 ? (
        <Typography variant="caption">No tasks assigned yet.</Typography>
      ) : (
        <DonutChart
          ariaLabel="My tasks by status"
          size={132}
          thickness={20}
          centerValue={insights.total}
          centerLabel="tasks"
          data={insights.statusSegments.map((segment) => ({ label: segment.name, value: segment.count, tone: segment.tone }))}
        />
      )}
    </SectionCard>

    <SectionCard title="How I'm doing" description={`Delivery across FY ${yearLabel}`} accent="teal">
      <ProgressRows ariaLabel="My delivery rates" rows={insights.rates} />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 1,
          mt: 1.75,
          pt: 1.5,
          borderTop: `1px solid ${colors.border}`,
        }}
      >
        <MiniStat label="Done" value={insights.completedCount} hint="tasks" />
        <MiniStat label="Avg size" value={`${insights.averageSize}`} hint="pts per task" />
        <MiniStat
          label="Best month"
          value={insights.best ? insights.best.label : '—'}
          hint={insights.best ? `${insights.best.points} pts` : 'no points yet'}
        />
      </Box>
    </SectionCard>
  </Box>
)
