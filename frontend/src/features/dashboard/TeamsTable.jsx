import { Box, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { UsersRound } from 'lucide-react'
import { SectionCard } from '@/components/SectionCard'
import { EmptyState } from '@/components/EmptyState'
import { ToneChip } from '@/components/ToneChip'
import { UserAvatar } from '@/components/UserAvatar'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { colors } from '@/theme/tokens'

const Meter = ({ percent }) => {
  const tone = percent >= 75 ? 'green' : percent >= 50 ? 'amber' : 'rose'
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 140 }}>
      <Box sx={{ flex: 1, height: 5, borderRadius: 999, bgcolor: colors.neutralSoft, overflow: 'hidden' }}>
        <Box sx={{ width: `${Math.min(100, percent)}%`, height: '100%', borderRadius: 999, bgcolor: STATUS_TONES[tone].strong, transition: 'width 300ms ease' }} />
      </Box>
      <Typography variant="body2" fontWeight={600} sx={{ width: 38, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {percent}%
      </Typography>
    </Stack>
  )
}

const Count = ({ value, tone }) => (
  <Typography
    variant="body2"
    sx={{
      fontWeight: value > 0 && tone ? 700 : 400,
      color: value > 0 && tone ? STATUS_TONES[tone].strong : colors.textSecondary,
      fontVariantNumeric: 'tabular-nums',
    }}
  >
    {value}
  </Typography>
)

export const TeamsTable = ({ teams, showWorkspace = false, title = 'Teams', description, action, maxHeight = 440 }) => (
  <SectionCard title={title} description={description} action={action} accent="teal" padded={false}>
    {teams.length === 0 ? (
      <EmptyState icon={UsersRound} title="No teams yet" description="Teams appear here once groups have them." />
    ) : (
      <TableContainer sx={{ maxHeight }}>
        <Table stickyHeader size="small" sx={{ minWidth: showWorkspace ? 860 : 760 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 180 }}>Team</TableCell>
              {showWorkspace ? <TableCell sx={{ width: 120 }}>Workspace</TableCell> : null}
              <TableCell sx={{ minWidth: 160 }}>Lead</TableCell>
              <TableCell align="right" sx={{ width: 90 }}>Members</TableCell>
              <TableCell align="right" sx={{ width: 90 }}>Assigned</TableCell>
              <TableCell sx={{ width: 190 }}>Completion</TableCell>
              <TableCell align="right" sx={{ width: 104 }}>Corrections</TableCell>
              <TableCell align="right" sx={{ width: 90 }}>Overdue</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {teams.map((team) => (
              <TableRow key={`${team.workspaceId ?? 'w'}-${team.id}`} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {team.name}
                  </Typography>
                  <ToneChip label={team.groupName} tone={team.groupTone} sx={{ mt: 0.375 }} />
                </TableCell>
                {showWorkspace ? (
                  <TableCell>
                    <ToneChip label={team.workspaceShortName} tone={team.workspaceTone} />
                  </TableCell>
                ) : null}
                <TableCell>
                  {team.leadName && team.leadName !== '—' ? (
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                      <UserAvatar name={team.leadName} size={24} />
                      <Typography variant="body2" noWrap>
                        {team.leadName}
                      </Typography>
                    </Stack>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      No lead
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Count value={team.members} />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {team.assigned}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Meter percent={team.assigned ? Math.round((team.completed / team.assigned) * 100) : 0} />
                </TableCell>
                <TableCell align="right">
                  <Count value={team.correctionMoves} tone="rose" />
                </TableCell>
                <TableCell align="right">
                  <Count value={team.overdue} tone="amber" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    )}
  </SectionCard>
)
