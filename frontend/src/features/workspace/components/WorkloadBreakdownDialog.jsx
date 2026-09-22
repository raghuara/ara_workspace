import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Breadcrumbs,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Link as MuiLink,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { ChartBarBig, ChevronRight, Trophy, X } from 'lucide-react'
import { MetricTile } from '@/components/MetricTile'
import { SectionCard } from '@/components/SectionCard'
import { EmptyState } from '@/components/EmptyState'
import { ToneChip } from '@/components/ToneChip'
import { DonutChart } from '@/components/charts/BarChart'
import { RankedBars } from '@/components/charts/RankedBars'
import { CHART_SEQUENCE } from '@/components/charts/chartColors'
import { colors } from '@/theme/tokens'

const METRICS = {
  points: { label: 'Points', unit: 'pts', valueOf: (row) => row.completedPoints },
  tasks: { label: 'Tasks', unit: 'tasks', valueOf: (row) => row.completedTasks },
}

const toneAt = (index) => CHART_SEQUENCE[index % CHART_SEQUENCE.length]
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

const openText = (row) => (row.openTasks ? ` · ${row.openTasks} open` : '')

const Leader = ({ label, value, hint }) => (
  <Box
    sx={{
      px: 1.125,
      py: 0.875,
      borderRadius: 2,
      bgcolor: colors.brandSoft,
      border: `1px solid ${colors.brandTint}`,
      minWidth: 0,
    }}
  >
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
      <Trophy size={12} strokeWidth={2} color={colors.brand} aria-hidden="true" />
      <Typography
        component="p"
        noWrap
        sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: colors.brandDark }}
      >
        {label}
      </Typography>
    </Stack>
    <Typography variant="body2" fontWeight={700} noWrap sx={{ mt: 0.25 }}>
      {value}
    </Typography>
    <Typography variant="caption" component="p" noWrap>
      {hint}
    </Typography>
  </Box>
)

const ChartArea = ({ title, description, bars, donut }) => (
  <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.7fr) minmax(240px, 1fr)' } }}>
    <SectionCard title={title} description={description} accent="blue" padded={false}>
      <Box sx={{ p: 1 }}>{bars}</Box>
    </SectionCard>
    <SectionCard title="Share" description="Of everything completed here" accent="violet">
      {donut}
    </SectionCard>
  </Box>
)

export const WorkloadBreakdownDialog = ({ report, periodLabel, workspaceTeams, filterGroupId, filterTeamId, onClose }) => {
  const [metric, setMetric] = useState('points')
  const [teamKey, setTeamKey] = useState(filterTeamId || null)
  const measure = METRICS[metric]

  const teams = useMemo(() => {
    const withWork = (report?.byTeam ?? []).map((team) => ({ ...team, key: team.teamId ?? 'none' }))
    const known = new Set(withWork.map((team) => team.key))
    const idle = workspaceTeams
      .filter((team) => !known.has(team.id))
      .filter((team) => (!filterGroupId || team.groupId === filterGroupId) && (!filterTeamId || team.id === filterTeamId))
      .map((team) => ({
        key: team.id,
        teamId: team.id,
        name: team.name,
        groupName: team.groupName,
        completedTasks: 0,
        completedPoints: 0,
        openTasks: 0,
        openPoints: 0,
        members: [],
      }))
    return [...withWork, ...idle]
      .sort((a, b) => measure.valueOf(b) - measure.valueOf(a) || b.completedTasks - a.completedTasks)
      .map((team, index) => ({ ...team, tone: toneAt(index) }))
  }, [report, workspaceTeams, filterGroupId, filterTeamId, measure])

  const team = teamKey ? (teams.find((item) => item.key === teamKey) ?? null) : null

  const members = useMemo(
    () =>
      (team?.members ?? [])
        .slice()
        .sort((a, b) => measure.valueOf(b) - measure.valueOf(a) || b.completedPoints - a.completedPoints)
        .map((member, index) => ({ ...member, tone: toneAt(index) })),
    [team, measure],
  )

  const level = team ? members : teams
  const totalPoints = level.reduce((sum, row) => sum + row.completedPoints, 0)
  const totalTasks = level.reduce((sum, row) => sum + row.completedTasks, 0)
  const openTasks = level.reduce((sum, row) => sum + row.openTasks, 0)
  const withWork = level.filter((row) => measure.valueOf(row) > 0)
  const leader = withWork[0] ?? null

  const topByPoints = members.reduce((best, row) => (row.completedPoints > (best?.completedPoints ?? -1) ? row : best), null)
  const topByTasks = members.reduce((best, row) => (row.completedTasks > (best?.completedTasks ?? -1) ? row : best), null)
  const divergence =
    team && topByPoints && topByTasks && topByPoints.employeeId !== topByTasks.employeeId && topByPoints.completedPoints > 0

  const donutData = withWork.map((row) => ({
    label: team ? row.fullName : row.name,
    value: measure.valueOf(row),
    tone: row.tone,
  }))

  const donut =
    donutData.length === 0 ? (
      <Typography variant="caption">Nothing completed in {periodLabel}.</Typography>
    ) : (
      <DonutChart
        ariaLabel={`Share of completed ${measure.label.toLowerCase()}`}
        data={donutData}
        centerValue={metric === 'points' ? totalPoints : totalTasks}
        centerLabel={measure.unit}
      />
    )

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
          <Box
            aria-hidden="true"
            sx={{ width: 34, height: 34, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: colors.brandSoft, color: colors.brand, flexShrink: 0 }}
          >
            <ChartBarBig size={17} strokeWidth={2} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
              <Typography variant="h3" component="h2">
                Who carried the work
              </Typography>
              <ToneChip label={periodLabel} tone="blue" />
            </Stack>
            <Breadcrumbs
              separator={<ChevronRight size={12} strokeWidth={1.75} aria-hidden="true" />}
              sx={{ mt: 0.25, '& .MuiBreadcrumbs-separator': { mx: 0.5 } }}
            >
              {team ? (
                <MuiLink component="button" type="button" variant="caption" underline="hover" onClick={() => setTeamKey(null)}>
                  All teams
                </MuiLink>
              ) : (
                <Typography variant="caption" fontWeight={600} color="text.primary">
                  All teams
                </Typography>
              )}
              {team ? (
                <Typography variant="caption" fontWeight={600} color="text.primary">
                  {team.name}
                  {team.groupName ? ` · ${team.groupName}` : ''}
                </Typography>
              ) : null}
            </Breadcrumbs>
          </Box>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={metric}
            onChange={(_, next) => next && setMetric(next)}
            aria-label="Rank by"
            sx={{ display: { xs: 'none', sm: 'inline-flex' }, '& .MuiToggleButton-root': { textTransform: 'none', px: 1.5, py: 0.375 } }}
          >
            <ToggleButton value="points">Points</ToggleButton>
            <ToggleButton value="tasks">Tasks</ToggleButton>
          </ToggleButtonGroup>
          <IconButton size="small" onClick={onClose} aria-label="Close breakdown">
            <X size={16} strokeWidth={2} />
          </IconButton>
        </Stack>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={metric}
          onChange={(_, next) => next && setMetric(next)}
          aria-label="Rank by"
          sx={{ display: { xs: 'flex', sm: 'none' }, mt: 1.25, '& .MuiToggleButton-root': { textTransform: 'none', py: 0.375 } }}
        >
          <ToggleButton value="points">Rank by points</ToggleButton>
          <ToggleButton value="tasks">Rank by tasks</ToggleButton>
        </ToggleButtonGroup>
      </DialogTitle>

      <DialogContent dividers sx={{ bgcolor: colors.page }}>
        <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, mb: 1.5 }}>
          <MetricTile
            label={team ? 'Members' : 'Teams'}
            value={team ? members.length : teams.length}
            hint={`${withWork.length} with completed work`}
            tone="violet"
          />
          <MetricTile label="Points completed" value={totalPoints} hint={team ? `in ${team.name}` : 'across these teams'} tone="teal" />
          <MetricTile label="Tasks completed" value={totalTasks} hint={openTasks ? `${openTasks} still open` : 'nothing left open'} tone="blue" />
          {leader ? (
            <Leader
              label={team ? 'Top performer' : 'Top team'}
              value={team ? leader.fullName : leader.name}
              hint={`${measure.valueOf(leader)} ${measure.unit}${team ? '' : ` · ${plural(leader.members.length, 'person')}`}`}
            />
          ) : (
            <MetricTile label={team ? 'Top performer' : 'Top team'} value="—" hint="no completed work yet" tone="slate" />
          )}
        </Box>

        {divergence ? (
          <Alert severity="info" sx={{ mb: 1.5 }}>
            <strong>{topByTasks.fullName}</strong> closed the most tasks ({topByTasks.completedTasks}), but{' '}
            <strong>{topByPoints.fullName}</strong> earned the most points ({topByPoints.completedPoints}) on bigger work.
          </Alert>
        ) : null}

        {level.length === 0 ? (
          <SectionCard padded={false}>
            <EmptyState
              title={team ? `Nobody has worked on ${team.name} yet` : `No team work in ${periodLabel}`}
              description="Pick another month or year from the page, or assign tasks to a team."
            />
          </SectionCard>
        ) : team ? (
          <ChartArea
            title={`Members of ${team.name}`}
            description={`Ranked by completed ${measure.label.toLowerCase()} · people who worked on this team's tasks`}
            bars={
              <RankedBars
                ariaLabel={`Members of ${team.name} ranked by ${measure.label.toLowerCase()}`}
                rows={members.map((member) => ({
                  key: member.employeeId,
                  label: member.fullName,
                  sublabel: member.designation,
                  avatarName: member.fullName,
                  value: measure.valueOf(member),
                  valueText: `${measure.valueOf(member)} ${measure.unit}`,
                  detail:
                    metric === 'points'
                      ? `${plural(member.completedTasks, 'task')} · avg ${member.averagePoints} pts${openText(member)}`
                      : `${member.completedPoints} pts · avg ${member.averagePoints} pts${openText(member)}`,
                  tone: member.tone,
                }))}
              />
            }
            donut={donut}
          />
        ) : (
          <ChartArea
            title="Teams"
            description={`Ranked by completed ${measure.label.toLowerCase()} · click a team to see its people`}
            bars={
              <RankedBars
                ariaLabel={`Teams ranked by ${measure.label.toLowerCase()}`}
                rows={teams.map((item) => ({
                  key: item.key,
                  label: item.name,
                  sublabel: item.groupName ? `${item.groupName} · ${plural(item.members.length, 'person')}` : plural(item.members.length, 'person'),
                  value: measure.valueOf(item),
                  valueText: `${measure.valueOf(item)} ${measure.unit}`,
                  detail:
                    metric === 'points'
                      ? `${plural(item.completedTasks, 'task')} completed${openText(item)}`
                      : `${item.completedPoints} pts completed${openText(item)}`,
                  tone: item.tone,
                  onClick: item.members.length > 0 ? () => setTeamKey(item.key) : undefined,
                }))}
              />
            }
            donut={donut}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
