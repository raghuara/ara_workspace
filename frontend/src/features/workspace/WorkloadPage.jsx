import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  LinearProgress,
  MenuItem,
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
import { ChartNoAxesColumn } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SectionCard } from '@/components/SectionCard'
import { StatCard } from '@/components/StatCard'
import { EmptyState } from '@/components/EmptyState'
import { QueryStateView } from '@/components/QueryStateView'
import { UserAvatar } from '@/components/UserAvatar'
import { ToneChip } from '@/components/ToneChip'
import { taskService } from '@/api/taskService'
import { STATUS_TONES, TASK_SIZES } from '@/constants/workspaceDomain'
import { workspaceViewPath } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
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

const ShareBar = ({ value, tone }) => {
  const palette = STATUS_TONES[tone] ?? STATUS_TONES.blue
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 110 }}>
      <Box sx={{ flex: 1, height: 5, borderRadius: 999, bgcolor: colors.neutralSoft, overflow: 'hidden' }}>
        <Box sx={{ width: `${Math.min(100, value)}%`, height: '100%', bgcolor: palette.strong }} />
      </Box>
      <Typography variant="caption" sx={{ width: 34, textAlign: 'right', fontWeight: 600 }}>
        {value}%
      </Typography>
    </Box>
  )
}

export const WorkloadPage = () => {
  const { activeWorkspaceId, activeWorkspace, groups, teams } = useWorkspace()
  const [groupId, setGroupId] = useState('')
  const [teamId, setTeamId] = useState('')

  const filters = useMemo(() => ({ groupId, teamId }), [groupId, teamId])

  const { data, loading, error, reload } = useAsync(
    taskService.getWorkloadReport,
    [activeWorkspaceId, filters],
    { enabled: Boolean(activeWorkspaceId) },
  )

  const teamOptions = groupId ? teams.filter((team) => team.groupId === groupId) : teams
  const rows = data?.rows ?? []

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
      />

      <Alert severity="info" sx={{ ...compactAlert, mb: 1.5 }}>
        <strong>Why two numbers.</strong> Counting tasks alone rewards whoever takes many small items; counting
        points alone rewards whoever takes a few large ones. Each task is sized{' '}
        {TASK_SIZES.map((size) => `${size.key}=${size.points}`).join(', ')} points, so five small tasks
        ({TASK_SIZES[1].points * 5} pts) and one extra-large task ({TASK_SIZES[4].points} pts) land close
        together instead of looking five times apart.
      </Alert>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1.5 }}>
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
          <StatCard label="Tasks completed" value={data?.totalCompletedTasks ?? 0} loading={loading} icon={ChartNoAxesColumn} tone="blue" />
          <StatCard label="Points completed" value={data?.totalCompletedPoints ?? 0} loading={loading} tone="teal" />
          <StatCard label="People with work" value={rows.length} loading={loading} tone="violet" />
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

        {divergence ? (
          <Alert severity="warning" sx={{ ...compactAlert, mb: 1.5 }}>
            <strong>{mostTasks.fullName}</strong> closed the most tasks ({mostTasks.completedTasks}), but{' '}
            <strong>{busiest.fullName}</strong> earned the most points ({busiest.completedPoints}) on{' '}
            {busiest.completedTasks} harder tasks. This is exactly the case task counts alone would get wrong.
          </Alert>
        ) : null}

        <SectionCard
          title="Per person"
          description={activeWorkspace ? `${activeWorkspace.name} · completed work` : undefined}
          padded={false}
        >
          {loading ? (
            <Box sx={{ p: 1.5 }}>
              <LinearProgress aria-label="Loading workload" />
            </Box>
          ) : rows.length === 0 ? (
            <EmptyState title="No completed work yet" description="Finish some tasks and the comparison appears here." />
          ) : (
            <TableContainer>
              <Table size="small" sx={{ minWidth: 880 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ minWidth: 220 }}>Person</TableCell>
                    <TableCell align="right" sx={{ width: 72 }}>Open</TableCell>
                    <TableCell align="right" sx={{ width: 96 }}>Completed</TableCell>
                    <TableCell align="right" sx={{ width: 80 }}>Points</TableCell>
                    <TableCell align="right" sx={{ width: 84 }}>Avg size</TableCell>
                    <TableCell sx={{ width: 160 }}>Share by tasks</TableCell>
                    <TableCell sx={{ width: 160 }}>Share by points</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.employeeId} hover>
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
                      <TableCell align="right">{row.openTasks}</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600}>
                          {row.completedTasks}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <ToneChip label={`${row.completedPoints}`} tone="teal" />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Average points per completed task — higher means harder work">
                          <Typography variant="body2" component="span">
                            {row.averagePoints}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <ShareBar value={row.taskShare} tone="slate" />
                      </TableCell>
                      <TableCell>
                        <ShareBar value={row.pointShare} tone="teal" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </SectionCard>
      </QueryStateView>
    </Box>
  )
}
