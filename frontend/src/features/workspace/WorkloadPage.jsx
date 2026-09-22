import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  IconButton,
  LinearProgress,
  MenuItem,
  Popover,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { ChartBarBig, ChartNoAxesColumn, Info, X } from 'lucide-react'
import { MonthPicker } from '@/components/MonthPicker'
import { PageHeader } from '@/components/PageHeader'
import { ColumnChart } from '@/components/charts/BarChart'
import { SectionCard } from '@/components/SectionCard'
import { StatCard } from '@/components/StatCard'
import { EmptyState } from '@/components/EmptyState'
import { QueryStateView } from '@/components/QueryStateView'
import { UserAvatar } from '@/components/UserAvatar'
import { ToneChip } from '@/components/ToneChip'
import { WorkloadBreakdownDialog } from './components/WorkloadBreakdownDialog'
import { taskService } from '@/api/taskService'
import { STATUS_TONES, TASK_SIZES } from '@/constants/workspaceDomain'
import { workspaceViewPath } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { usePeriod } from '@/hooks/usePeriod'
import { useWorkspace } from '@/hooks/useWorkspace'
import { colors, layout } from '@/theme/tokens'

const compactAlert = {
  py: 0.25,
  fontSize: '0.8125rem',
  lineHeight: 1.45,
  '& .MuiAlert-icon': { py: 0.75, mr: 1, fontSize: 18 },
  '& .MuiAlert-message': { py: 0.75 },
}

const compactSelect = { minWidth: { sm: 170 }, '& .MuiInputBase-root': { bgcolor: colors.surface } }

const nearestSize = (average) =>
  TASK_SIZES.reduce((best, size) => {
    const distance = Math.abs(size.points - average)
    const bestDistance = Math.abs(best.points - average)
    return distance < bestDistance || (distance === bestDistance && size.points > best.points) ? size : best
  }, TASK_SIZES[0])

const OutputShare = ({ pointShare, taskShare }) => (
  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 200 }}>
    <Box sx={{ flex: 1, position: 'relative', height: 12 }}>
      <Box sx={{ position: 'absolute', inset: 0, borderRadius: 999, bgcolor: colors.neutralSoft }} />
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: 7,
          width: `${Math.min(100, pointShare)}%`,
          borderRadius: 999,
          bgcolor: colors.brand,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: 3,
          width: `${Math.min(100, taskShare)}%`,
          borderRadius: 999,
          bgcolor: '#94A3B8',
        }}
      />
    </Box>
    <Box sx={{ width: 76, textAlign: 'right', lineHeight: 1.2 }}>
      <Typography variant="body2" component="p" sx={{ fontWeight: 700, color: colors.brandDark, fontVariantNumeric: 'tabular-nums' }}>
        {pointShare}% pts
      </Typography>
      <Typography variant="caption" component="p" sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {taskShare}% tasks
      </Typography>
    </Box>
  </Stack>
)

const RankBadge = ({ rank }) => (
  <Box
    sx={{
      width: 24,
      height: 24,
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
      fontSize: '0.6875rem',
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
      bgcolor: rank === 1 ? colors.brand : colors.neutralSoft,
      color: rank === 1 ? '#FFFFFF' : colors.textSecondary,
      boxShadow: rank === 1 ? '0 1px 2px rgba(37, 99, 235, 0.35)' : 'none',
    }}
  >
    {rank}
  </Box>
)

export const WorkloadPage = () => {
  const { activeWorkspaceId, activeWorkspace, groups, teams } = useWorkspace()
  const { yearLabel, months, selectedMonth, yearRange, range, periodLabel } = usePeriod()
  const [groupId, setGroupId] = useState('')
  const [teamId, setTeamId] = useState('')
  const [helpAnchor, setHelpAnchor] = useState(null)
  const [breakdownOpen, setBreakdownOpen] = useState(false)

  const enabled = Boolean(activeWorkspaceId)
  const yearReport = useAsync(taskService.getWorkloadReport, [activeWorkspaceId, { groupId, teamId, ...yearRange }], {
    enabled,
  })
  const monthReport = useAsync(taskService.getWorkloadReport, [activeWorkspaceId, { groupId, teamId, ...range }], {
    enabled: enabled && Boolean(selectedMonth),
  })
  const { data, loading, error, reload } = selectedMonth ? monthReport : yearReport

  const pointsByMonth = new Map((yearReport.data?.byMonth ?? []).map((entry) => [entry.month, entry.completedPoints]))
  const monthlyChart = months.map((option) => ({ label: option.short, value: pointsByMonth.get(option.key) ?? 0 }))

  const teamOptions = groupId ? teams.filter((team) => team.groupId === groupId) : teams
  const rows = data?.rows ?? []
  const ranked = [...rows].sort(
    (a, b) => b.completedPoints - a.completedPoints || b.completedTasks - a.completedTasks || a.fullName.localeCompare(b.fullName),
  )

  const busiest = rows.reduce(
    (best, row) => (row.completedPoints > (best?.completedPoints ?? -1) ? row : best),
    null,
  )
  const mostTasks = rows.reduce(
    (best, row) => (row.completedTasks > (best?.completedTasks ?? -1) ? row : best),
    null,
  )
  const divergence = busiest && mostTasks && busiest.employeeId !== mostTasks.employeeId

  return (
    <Box
      sx={{
        maxWidth: layout.wideMaxWidth,
        mx: 'auto',
        px: { xs: 1.5, sm: 2, md: 3, lg: 4 },
        py: { xs: 1.5, md: 2.5 },
      }}
    >
      <PageHeader
        title="Workload"
        description="Completed work measured two ways, so volume and complexity can be compared fairly."
        breadcrumbs={[{ label: 'Work', to: workspaceViewPath('board') }, { label: 'Workload' }]}
        actions={
          <>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Info size={14} strokeWidth={2} />}
              onClick={(event) => setHelpAnchor(event.currentTarget)}
              aria-haspopup="dialog"
              aria-expanded={Boolean(helpAnchor)}
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            >
              How scoring works
            </Button>
            <Tooltip title="How scoring works">
              <IconButton
                size="small"
                onClick={(event) => setHelpAnchor(event.currentTarget)}
                aria-label="How scoring works"
                sx={{ display: { xs: 'inline-flex', sm: 'none' }, border: `1px solid ${colors.border}` }}
              >
                <Info size={16} strokeWidth={1.75} />
              </IconButton>
            </Tooltip>
          </>
        }
      />

      <Popover
        open={Boolean(helpAnchor)}
        anchorEl={helpAnchor}
        onClose={() => setHelpAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 360,
              maxWidth: 'calc(100vw - 24px)',
              mt: 1,
              p: 2,
              borderRadius: 2.5,
              boxShadow: '0 16px 40px rgba(15, 23, 42, 0.14), 0 2px 6px rgba(15, 23, 42, 0.06)',
            },
          },
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
          <Typography variant="h4" component="h2" sx={{ flex: 1 }}>
            Why two numbers
          </Typography>
          <IconButton size="small" aria-label="Close" onClick={() => setHelpAnchor(null)}>
            <X size={14} strokeWidth={2} />
          </IconButton>
        </Stack>

        <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 1.75 }}>
          Counting tasks alone rewards whoever takes many small items; counting points alone rewards whoever takes a few
          large ones. Each completed task earns points by its size, so both views are shown side by side.
        </Typography>

        <Typography
          component="p"
          sx={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: colors.textSecondary, mb: 0.75 }}
        >
          Task sizes
        </Typography>
        <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', mb: 1.75 }}>
          {TASK_SIZES.map((size) => (
            <Tooltip key={size.key} title={`${size.label} — ${size.guide}`}>
              <Box
                sx={{
                  px: 1,
                  py: 0.5,
                  borderRadius: 1.5,
                  bgcolor: STATUS_TONES.blue.soft,
                  border: `1px solid ${STATUS_TONES.blue.border}`,
                  color: STATUS_TONES.blue.strong,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {size.key}{' '}
                <Box component="span" sx={{ fontWeight: 500, opacity: 0.8 }}>
                  {size.points} pts
                </Box>
              </Box>
            </Tooltip>
          ))}
        </Stack>

        <Typography
          component="p"
          sx={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: colors.textSecondary, mb: 0.75 }}
        >
          Example
        </Typography>
        <Stack spacing={0.875}>
          {[
            { label: `5 × ${TASK_SIZES[1].key}`, hint: '5 tasks', points: TASK_SIZES[1].points * 5, tone: 'slate' },
            { label: `1 × ${TASK_SIZES[4].key}`, hint: '1 task', points: TASK_SIZES[4].points, tone: 'teal' },
          ].map((row) => (
            <Stack key={row.label} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="body2" sx={{ width: 52, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {row.label}
              </Typography>
              <Typography variant="caption" sx={{ width: 48 }}>
                {row.hint}
              </Typography>
              <Box sx={{ flex: 1, height: 8, borderRadius: 999, bgcolor: colors.neutralSoft, overflow: 'hidden' }}>
                <Box
                  sx={{
                    width: `${(row.points / TASK_SIZES[4].points) * 100}%`,
                    height: '100%',
                    borderRadius: 999,
                    bgcolor: STATUS_TONES[row.tone].strong,
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ width: 44, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {row.points} pts
              </Typography>
            </Stack>
          ))}
        </Stack>
        <Typography variant="caption" component="p" sx={{ mt: 1.25 }}>
          Five small tasks and one extra-large task land close together — not five times apart.
        </Typography>
      </Popover>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap sx={{ mb: 1.5, flexWrap: { sm: 'wrap' } }}>
        <MonthPicker hint="Workload counts only tasks completed in the period you pick." />
        <TextField
          select
          size="small"
          label="Group"
          value={groupId}
          onChange={(event) => {
            setGroupId(event.target.value)
            setTeamId('')
          }}
          sx={compactSelect}
        >
          <MenuItem value="">All groups</MenuItem>
          {groups.map((group) => (
            <MenuItem key={group.id} value={group.id}>
              {group.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Team"
          value={teamId}
          onChange={(event) => setTeamId(event.target.value)}
          sx={compactSelect}
        >
          <MenuItem value="">All teams</MenuItem>
          {teamOptions.map((team) => (
            <MenuItem key={team.id} value={team.id}>
              {team.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <QueryStateView error={error} onRetry={reload}>
        <Box
          sx={{
            display: 'grid',
            gap: { xs: 1, md: 1.5 },
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            mb: 1.5,
          }}
        >
          <StatCard
            label="Tasks completed"
            value={data?.totalCompletedTasks ?? 0}
            helperText={`in ${periodLabel}`}
            loading={loading}
            icon={ChartNoAxesColumn}
            tone="blue"
          />
          <StatCard
            label="Points completed"
            value={data?.totalCompletedPoints ?? 0}
            helperText={`in ${periodLabel}`}
            loading={loading}
            tone="teal"
          />
          <StatCard label="People with work" value={rows.length} helperText="completed or still open" loading={loading} tone="violet" />
          <StatCard
            label="Average task size"
            value={
              data?.totalCompletedTasks
                ? (data.totalCompletedPoints / data.totalCompletedTasks).toFixed(1)
                : '0'
            }
            helperText="points per completed task"
            loading={loading}
            tone="amber"
          />
        </Box>

        <SectionCard
          title="Points by month"
          description={`FY ${yearLabel} · completed points each month, average marked`}
          sx={{ mb: 1.5 }}
          action={
            <Button
              size="small"
              variant="outlined"
              startIcon={<ChartBarBig size={15} strokeWidth={2} />}
              onClick={() => setBreakdownOpen(true)}
              disabled={loading && !data}
            >
              Team &amp; people breakdown
            </Button>
          }
        >
          {yearReport.loading && !yearReport.data ? (
            <LinearProgress aria-label="Loading monthly points" />
          ) : (
            <ColumnChart ariaLabel="Completed points by month" seriesLabel="Points" data={monthlyChart} height={150} maxBarWidth={32} />
          )}
        </SectionCard>

        {divergence ? (
          <Alert severity="warning" sx={{ ...compactAlert, mb: 1.5 }}>
            <strong>{mostTasks.fullName}</strong> closed the most tasks ({mostTasks.completedTasks}), but{' '}
            <strong>{busiest.fullName}</strong> earned the most points ({busiest.completedPoints}) on{' '}
            {busiest.completedTasks} harder tasks. This is exactly the case task counts alone would get wrong.
          </Alert>
        ) : null}

        <SectionCard
          title="Per person"
          description={`Ranked by points earned${activeWorkspace ? ` · ${activeWorkspace.name}` : ''} — one ${TASK_SIZES[4].points}-pt task counts more than four ${TASK_SIZES[1].points}-pt tasks`}
          padded={false}
          action={
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', display: { xs: 'none', md: 'flex' } }}>
              <Stack direction="row" spacing={0.625} sx={{ alignItems: 'center' }}>
                <Box sx={{ width: 14, height: 7, borderRadius: 999, bgcolor: colors.brand }} />
                <Typography variant="caption">Share of points</Typography>
              </Stack>
              <Stack direction="row" spacing={0.625} sx={{ alignItems: 'center' }}>
                <Box sx={{ width: 14, height: 3, borderRadius: 999, bgcolor: '#94A3B8' }} />
                <Typography variant="caption">Share of tasks</Typography>
              </Stack>
            </Stack>
          }
        >
          {loading ? (
            <Box sx={{ p: 1.5 }}>
              <LinearProgress aria-label="Loading workload" />
            </Box>
          ) : rows.length === 0 ? (
            <EmptyState title={`No work in ${periodLabel}`} description="Pick another month or year, or finish some tasks and the comparison appears here." />
          ) : (
            <TableContainer>
              <Table size="small" sx={{ minWidth: 1000 }}>
                <TableHead>
                  <TableRow>
                    <TableCell align="center" sx={{ width: 52 }}>#</TableCell>
                    <TableCell sx={{ minWidth: 220 }}>Person</TableCell>
                    <TableCell align="right" sx={{ width: 90 }}>
                      <Tooltip title="Assigned and not yet completed">
                        <span>Open now</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" sx={{ width: 96 }}>Tasks done</TableCell>
                    <TableCell align="right" sx={{ width: 116 }}>
                      <Tooltip title={`Sum of size points for completed tasks (${TASK_SIZES.map((size) => `${size.key} ${size.points}`).join(' · ')})`}>
                        <span>Points earned</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" sx={{ width: 128 }}>
                      <Tooltip title="Average points per completed task — higher means harder work">
                        <span>Avg per task</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ width: 300 }}>Share of output</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ranked.map((row, index) => {
                    const rank = index + 1
                    const size = nearestSize(row.averagePoints)
                    return (
                      <TableRow key={row.employeeId} hover>
                        <TableCell align="center">
                          <RankBadge rank={rank} />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                            <UserAvatar name={row.fullName} size={28} />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body2" fontWeight={600} noWrap sx={{ lineHeight: 1.3 }}>
                                {row.fullName}
                              </Typography>
                              <Typography variant="caption" component="p" color="text.secondary" noWrap sx={{ lineHeight: 1.3 }}>
                                {row.designation}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ color: row.openTasks ? colors.textPrimary : colors.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                            {row.openTasks}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                            {row.completedTasks}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Box
                            component="span"
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'baseline',
                              gap: 0.375,
                              px: 1,
                              py: 0.375,
                              borderRadius: 1.5,
                              bgcolor: rank === 1 ? colors.brand : colors.brandSoft,
                              color: rank === 1 ? '#FFFFFF' : colors.brandDark,
                              border: `1px solid ${rank === 1 ? colors.brand : STATUS_TONES.blue.border}`,
                              fontWeight: 700,
                              fontSize: '0.875rem',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {row.completedPoints}
                            <Box component="span" sx={{ fontSize: '0.6875rem', fontWeight: 600, opacity: 0.85 }}>
                              pts
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                              {row.averagePoints}
                            </Typography>
                            <Tooltip title={`${size.label} on average — ${size.guide}`}>
                              <Box component="span" sx={{ display: 'inline-flex' }}>
                                <ToneChip label={`≈ ${size.key}`} tone={size.points >= 8 ? 'amber' : size.points >= 5 ? 'blue' : 'gray'} />
                              </Box>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <OutputShare pointShare={row.pointShare} taskShare={row.taskShare} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </SectionCard>
      </QueryStateView>

      {breakdownOpen ? (
        <WorkloadBreakdownDialog
          report={data}
          periodLabel={periodLabel}
          workspaceTeams={teams}
          filterGroupId={groupId}
          filterTeamId={teamId}
          onClose={() => setBreakdownOpen(false)}
        />
      ) : null}
    </Box>
  )
}
