import { Box, Button, Divider, Stack, Typography } from '@mui/material'
import { ArrowRight, Layers, Users, UsersRound } from 'lucide-react'
import { ColumnChart, HorizontalBars } from '@/components/charts/BarChart'
import { MetricTile } from '@/components/MetricTile'
import { ToneChip } from '@/components/ToneChip'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { colors } from '@/theme/tokens'
import { StatusSplitBar } from './StatusSplitBar'

/**
 * One workspace, rolled up. `compact` drops the charts so the master view can
 * line several up; the full form is what an admin sees for their own workspace.
 */
export const WorkspaceSummaryCard = ({ workspace, compact = false, onOpen }) => {
  const tone = STATUS_TONES[workspace.tone] ?? STATUS_TONES.blue

  return (
    <Box
      sx={{
        bgcolor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 2.5,
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack
        direction="row"
        spacing={1.25}
        sx={{ alignItems: 'center', px: 1.75, py: 1.25, borderBottom: `1px solid ${colors.border}`, bgcolor: tone.soft }}
      >
        <Box
          aria-hidden="true"
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            display: 'grid',
            placeItems: 'center',
            bgcolor: colors.surface,
            color: tone.strong,
            border: `1px solid ${tone.border}`,
            fontSize: '0.6875rem',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {workspace.shortName}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h4" noWrap>
            {workspace.name}
          </Typography>
          <Typography variant="caption" component="p" noWrap>
            {workspace.adminNames.length ? `Admin: ${workspace.adminNames.join(', ')}` : 'No admin assigned'}
          </Typography>
        </Box>
        <ToneChip label={`${workspace.completionRate}% done`} tone={workspace.completionRate >= 50 ? 'green' : 'amber'} />
      </Stack>

      <Box sx={{ p: 1.75, flex: 1 }}>
        <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', mb: 1.5 }}>
          <MetricTile label="Tasks" value={workspace.tasks} tone="blue" />
          <MetricTile label="Open" value={workspace.open} tone="violet" />
          <MetricTile label="Correction" value={workspace.inCorrection} tone="rose" warn />
          <MetricTile label="Overdue" value={workspace.overdue} tone="amber" warn />
        </Box>

        <Box sx={{ mb: 1.5 }}>
          <StatusSplitBar
            ariaLabel={`Tasks by status in ${workspace.name}`}
            segments={workspace.byStatus}
            legend={!compact}
          />
        </Box>

        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', mb: compact ? 0 : 1.5 }} useFlexGap>
          <Stack direction="row" spacing={0.625} sx={{ alignItems: 'center', color: colors.textSecondary }}>
            <Users size={13} strokeWidth={1.75} aria-hidden="true" />
            <Typography variant="caption">{workspace.members} members</Typography>
          </Stack>
          <Stack direction="row" spacing={0.625} sx={{ alignItems: 'center', color: colors.textSecondary }}>
            <Layers size={13} strokeWidth={1.75} aria-hidden="true" />
            <Typography variant="caption">{workspace.groups} groups</Typography>
          </Stack>
          <Stack direction="row" spacing={0.625} sx={{ alignItems: 'center', color: colors.textSecondary }}>
            <UsersRound size={13} strokeWidth={1.75} aria-hidden="true" />
            <Typography variant="caption">{workspace.teams} teams</Typography>
          </Stack>
          <Typography variant="caption" sx={{ color: colors.textSecondary }}>
            {workspace.completedPoints}/{workspace.points} pts
          </Typography>
        </Stack>

        {compact ? null : (
          <>
            <Divider sx={{ mb: 1.5 }} />
            <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
              <Box>
                <Typography variant="subtitle2" component="p" sx={{ mb: 1.25 }}>
                  Tasks by status
                </Typography>
                <ColumnChart
                  ariaLabel={`Tasks by status in ${workspace.name}`}
                  data={workspace.byStatus.map((column) => ({ label: column.name, value: column.count, tone: column.tone }))}
                />
              </Box>
              <Box>
                <Typography variant="subtitle2" component="p" sx={{ mb: 1.25 }}>
                  Assigned vs corrections, per team
                </Typography>
                {workspace.byTeam.length === 0 ? (
                  <Typography variant="caption">No teams yet.</Typography>
                ) : (
                  <HorizontalBars
                    ariaLabel={`Assigned tasks and corrections per team in ${workspace.name}`}
                    secondaryLabel="· corrections"
                    rows={workspace.byTeam.map((team) => ({
                      label: team.name,
                      sublabel: `${team.groupName} · ${team.members} members · lead ${team.leadName}`,
                      value: team.assigned,
                      secondary: team.correctionMoves,
                      tone: team.groupTone,
                    }))}
                  />
                )}
              </Box>
            </Box>
          </>
        )}
      </Box>

      {onOpen ? (
        <Stack direction="row" sx={{ px: 1.75, py: 1, borderTop: `1px solid ${colors.border}`, justifyContent: 'flex-end' }}>
          <Button size="small" variant="contained" onClick={() => onOpen(workspace.id)} endIcon={<ArrowRight size={14} strokeWidth={2} />}>
            Open board
          </Button>
        </Stack>
      ) : null}
    </Box>
  )
}
