import { useState } from 'react'
import { Box, Button, Drawer, IconButton, Skeleton, Stack, Typography } from '@mui/material'
import { ArrowLeft, ArrowRight, ChevronRight, X } from 'lucide-react'
import { MetricTile } from '@/components/MetricTile'
import { ToneChip } from '@/components/ToneChip'
import { UserAvatar } from '@/components/UserAvatar'
import { QueryStateView } from '@/components/QueryStateView'
import { ColumnChart } from '@/components/charts/BarChart'
import { dashboardService } from '@/api/dashboardService'
import { FEATURES } from '@/constants/features'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { useAsync } from '@/hooks/useAsync'
import { useFeatures } from '@/hooks/useFeatures'
import { usePeriod } from '@/hooks/usePeriod'
import { colors } from '@/theme/tokens'
import { formatDate } from '@/utils/date'
import { getInitials } from '@/utils/format'

const SCOPE_LABEL = { workspace: 'Workspace', group: 'Group', team: 'Team' }
const ROLE_TONES = { Admin: 'blue', Lead: 'violet', 'Team lead': 'teal', Member: 'slate' }

const goodWhenHigh = (percent) => (percent >= 75 ? 'teal' : percent >= 50 ? 'amber' : 'rose')
const goodWhenLow = (percent) => (percent <= 10 ? 'teal' : percent <= 25 ? 'amber' : 'rose')

const Section = ({ title, hint, children }) => (
  <Box>
    <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 1 }}>
      <Typography variant="subtitle2" component="h3">
        {title}
      </Typography>
      {hint ? <Typography variant="caption">{hint}</Typography> : null}
    </Stack>
    {children}
  </Box>
)

const RateBar = ({ label, percent, hint, tone }) => {
  const palette = STATUS_TONES[tone]
  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 0.375 }}>
        <Typography variant="body2" fontWeight={600}>
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={700} sx={{ color: palette.strong, fontVariantNumeric: 'tabular-nums' }}>
          {percent}%
        </Typography>
      </Stack>
      <Box sx={{ height: 6, borderRadius: 999, bgcolor: palette.soft, border: `1px solid ${palette.border}`, overflow: 'hidden' }}>
        <Box sx={{ width: `${Math.min(100, percent)}%`, height: '100%', bgcolor: palette.strong, borderRadius: 999, transition: 'width 240ms ease' }} />
      </Box>
      <Typography variant="caption" component="p" sx={{ mt: 0.375 }}>
        {hint}
      </Typography>
    </Box>
  )
}

const EntityRow = ({ tone, title, subtitle, open, completed, rework, percent, onDetails, onBoard }) => {
  const palette = STATUS_TONES[tone] ?? STATUS_TONES.slate
  return (
    <Box sx={{ border: `1px solid ${colors.border}`, borderRadius: 2, px: 1.25, py: 1 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Box aria-hidden="true" sx={{ width: 9, height: 9, borderRadius: '3px', bgcolor: palette.strong, flexShrink: 0 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {title}
          </Typography>
          <Typography variant="caption" component="p" noWrap>
            {subtitle}
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums', display: { xs: 'none', sm: 'block' } }}>
          {open} open · {completed} done
        </Typography>
        <Button size="small" onClick={onDetails} endIcon={<ChevronRight size={13} strokeWidth={2} />} sx={{ flexShrink: 0, minWidth: 0 }}>
          Details
        </Button>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.75 }}>
        <Box sx={{ flex: 1, height: 5, borderRadius: 999, bgcolor: colors.neutralSoft, overflow: 'hidden' }}>
          <Box sx={{ width: `${percent}%`, height: '100%', bgcolor: palette.strong, borderRadius: 999 }} />
        </Box>
        <Typography variant="caption" fontWeight={600} sx={{ width: 34, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
          {percent}%
        </Typography>
        {rework > 0 ? <ToneChip label={`${rework} rework`} tone="rose" /> : null}
        <Button size="small" variant="text" onClick={onBoard} sx={{ minWidth: 0, px: 0.75 }}>
          Board
        </Button>
      </Stack>
    </Box>
  )
}

const PersonRow = ({ member, showTeam }) => (
  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', py: 0.875, borderBottom: `1px solid ${colors.border}`, '&:last-of-type': { borderBottom: 0 } }}>
    <UserAvatar name={member.fullName} size={30} />
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {member.fullName}
        </Typography>
        <ToneChip label={member.role} tone={ROLE_TONES[member.role] ?? 'slate'} />
      </Stack>
      <Typography variant="caption" component="p" noWrap>
        {member.designation}
        {showTeam && member.teamName ? ` · ${member.teamName}` : ''}
      </Typography>
    </Box>
    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
      <Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {member.open} open
      </Typography>
      <Typography variant="caption" component="p" sx={{ color: member.overdue ? STATUS_TONES.rose.strong : colors.textSecondary }}>
        {member.overdue ? `${member.overdue} overdue` : `${member.completed} done`}
      </Typography>
    </Box>
  </Stack>
)

const Loading = () => (
  <Stack spacing={2} sx={{ p: 2 }}>
    <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(3, 1fr)' }}>
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <Skeleton key={index} variant="rounded" height={62} />
      ))}
    </Box>
    <Skeleton variant="rounded" height={120} />
    <Skeleton variant="rounded" height={160} />
    <Skeleton variant="rounded" height={140} />
  </Stack>
)

/**
 * Right-hand detail panel for the entity the work page is showing. Groups and
 * teams listed inside it drill down in place, so an admin can walk
 * workspace → group → team without leaving the board.
 */
export const ScopeDetailsDrawer = ({ workspaceId, scope, onClose, onOpenBoard }) => {
  const { isEnabled } = useFeatures()
  const [cursor, setCursor] = useState({ groupId: scope.groupId ?? '', teamId: scope.teamId ?? '' })
  const [trail, setTrail] = useState([])

  const { range, periodLabel } = usePeriod()
  const summary = useAsync(dashboardService.getScopeSummary, [workspaceId, { ...cursor, ...range }])
  const data = summary.data
  const showPoints = isEnabled(FEATURES.WEIGHTAGE)

  const drill = (target) => {
    setTrail((current) => [...current, cursor])
    setCursor({ groupId: target.groupId ?? '', teamId: target.teamId ?? '' })
  }

  const back = () => {
    const previous = trail[trail.length - 1]
    if (!previous) return
    setTrail((current) => current.slice(0, -1))
    setCursor(previous)
  }

  const tone = STATUS_TONES[data?.tone] ?? STATUS_TONES.blue
  const lead = data?.lead
  const admins = data?.admins ?? []

  return (
    <Drawer
      anchor="right"
      open
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 520, lg: 600 }, borderLeft: `1px solid ${colors.border}` } } }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', px: 2, py: 1.5, borderBottom: `1px solid ${colors.border}`, bgcolor: tone.soft }}>
        {trail.length > 0 ? (
          <IconButton size="small" onClick={back} aria-label="Back">
            <ArrowLeft size={16} strokeWidth={2} />
          </IconButton>
        ) : null}
        <Box
          aria-hidden="true"
          sx={{
            width: 36,
            height: 36,
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
          {data ? (data.shortName ?? getInitials(data.name)) : '…'}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Typography variant="h3" component="h2" noWrap>
              {data?.name ?? 'Loading…'}
            </Typography>
            {data ? <ToneChip label={SCOPE_LABEL[data.scope]} tone={data.tone} /> : null}
            <ToneChip label={periodLabel} tone="blue" />
          </Stack>
          <Typography variant="caption" component="p" noWrap>
            {data?.subtitle ?? ''}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Close details">
          <X size={16} strokeWidth={2} />
        </IconButton>
      </Stack>

      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        <QueryStateView error={summary.error} onRetry={summary.reload}>
          {summary.loading || !data ? (
            <Loading />
          ) : (
            <Stack spacing={2.25} sx={{ p: 2 }}>
              {lead || admins.length > 0 ? (
                <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', rowGap: 1 }} useFlexGap>
                  {(lead ? [{ ...lead, role: 'Lead' }] : admins.map((admin) => ({ ...admin, role: 'Admin' }))).map((who) => (
                    <Stack key={who.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <UserAvatar name={who.fullName} size={28} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap sx={{ lineHeight: 1.25 }}>
                          {who.fullName}
                        </Typography>
                        <Typography variant="caption" component="p" noWrap>
                          {who.role} · {who.designation}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                  {data.createdAt ? (
                    <Typography variant="caption" sx={{ ml: 'auto', alignSelf: 'center' }}>
                      Since {formatDate(data.createdAt)}
                    </Typography>
                  ) : null}
                </Stack>
              ) : null}

              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' } }}>
                <MetricTile label="Tasks" value={data.tasks} hint={`${data.open} open`} tone="blue" />
                <MetricTile label="Completed" value={data.completed} hint={`${data.completionRate}% of all`} tone="teal" />
                <MetricTile label="Correction" value={data.inCorrection} hint={`${data.correctionMoves} rework moves`} tone="rose" warn />
                <MetricTile label="Overdue" value={data.overdue} hint={data.dueToday ? `${data.dueToday} due today` : 'none due today'} tone="amber" warn />
                <MetricTile label="People" value={data.counts.members} hint={data.scope === 'workspace' ? `${data.counts.groups} groups · ${data.counts.teams} teams` : data.scope === 'group' ? `${data.counts.teams} teams` : 'in this team'} tone="violet" />
                {showPoints ? <MetricTile label="Points" value={`${data.completedPoints}/${data.points}`} hint="earned of planned" tone="orange" /> : null}
              </Box>

              <Section title="Performance">
                <Stack spacing={1.5}>
                  <RateBar label="Completion" percent={data.completionRate} hint={`${data.completed} of ${data.tasks} tasks completed`} tone={goodWhenHigh(data.completionRate)} />
                  <RateBar label="Rework" percent={data.correctionRate} hint={`${data.correctionMoves} tasks sent back to correction — lower is better`} tone={goodWhenLow(data.correctionRate)} />
                  <RateBar
                    label="Overdue share"
                    percent={data.open ? Math.round((data.overdue / data.open) * 100) : 0}
                    hint={`${data.overdue} of ${data.open} open tasks past their due date`}
                    tone={goodWhenLow(data.open ? Math.round((data.overdue / data.open) * 100) : 0)}
                  />
                  {showPoints ? (
                    <RateBar
                      label="Points earned"
                      percent={data.points ? Math.round((data.completedPoints / data.points) * 100) : 0}
                      hint={`${data.completedPoints} of ${data.points} points delivered`}
                      tone={goodWhenHigh(data.points ? Math.round((data.completedPoints / data.points) * 100) : 0)}
                    />
                  ) : null}
                </Stack>
              </Section>

              <Section title="Work by status" hint={`${data.tasks} tasks`}>
                <ColumnChart
                  ariaLabel={`Tasks by status in ${data.name}`}
                  height={128}
                  monochrome={false}
                  showAverage={false}
                  data={data.byStatus.map((column) => ({ label: column.name, value: column.count, tone: column.tone }))}
                />
              </Section>

              <Section title="Open by priority">
                <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap' }} useFlexGap>
                  {data.byPriority.map((row) => (
                    <ToneChip key={row.label} label={`${row.label} · ${row.value}`} tone={row.tone} size="medium" />
                  ))}
                </Stack>
              </Section>

              {data.groups.length > 0 ? (
                <Section title="Groups" hint={`${data.groups.length} in this workspace`}>
                  <Stack spacing={1}>
                    {data.groups.map((group) => (
                      <EntityRow
                        key={group.id}
                        tone={group.tone}
                        title={group.name}
                        subtitle={`Lead ${group.leadName} · ${group.teams} teams · ${group.members} people`}
                        open={group.open}
                        completed={group.completed}
                        rework={group.correctionMoves}
                        percent={group.completionRate}
                        onDetails={() => drill({ groupId: group.id })}
                        onBoard={() => onOpenBoard({ groupId: group.id, teamId: '' })}
                      />
                    ))}
                  </Stack>
                </Section>
              ) : null}

              {data.teams.length > 0 ? (
                <Section title="Teams" hint={data.scope === 'group' ? `${data.teams.length} in this group` : `${data.teams.length} across all groups`}>
                  <Stack spacing={1}>
                    {data.teams.map((team) => (
                      <EntityRow
                        key={team.id}
                        tone={team.groupTone}
                        title={team.name}
                        subtitle={`${data.scope === 'workspace' ? `${team.groupName} · ` : ''}Lead ${team.leadName} · ${team.members} members`}
                        open={team.open}
                        completed={team.completed}
                        rework={team.correctionMoves}
                        percent={team.completionRate}
                        onDetails={() => drill({ groupId: team.groupId, teamId: team.id })}
                        onBoard={() => onOpenBoard({ groupId: team.groupId, teamId: team.id })}
                      />
                    ))}
                  </Stack>
                </Section>
              ) : null}

              <Section title="People" hint={`${data.members.length} ${data.members.length === 1 ? 'person' : 'people'}`}>
                {data.members.length === 0 ? (
                  <Typography variant="caption">Nobody has been added yet.</Typography>
                ) : (
                  <Box>
                    {data.members.map((member) => (
                      <PersonRow key={member.id} member={member} showTeam={data.scope !== 'team'} />
                    ))}
                  </Box>
                )}
              </Section>

              {data.byClient.length > 0 ? (
                <Section title="Clients" hint="most work first">
                  <Stack spacing={0.75}>
                    {data.byClient.map((client) => (
                      <Stack key={client.id} direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                        <ToneChip label={client.name} tone={client.tone} size="medium" />
                        <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {client.open} open · {client.count} total
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Section>
              ) : null}
            </Stack>
          )}
        </QueryStateView>
      </Box>

      <Stack direction="row" spacing={1} sx={{ px: 2, py: 1.25, borderTop: `1px solid ${colors.border}`, justifyContent: 'flex-end', bgcolor: colors.surface }}>
        {trail.length > 0 ? (
          <Button size="small" variant="outlined" onClick={back} startIcon={<ArrowLeft size={14} strokeWidth={2} />}>
            Back
          </Button>
        ) : null}
        <Button
          size="small"
          variant="contained"
          disabled={!data}
          onClick={() => onOpenBoard(cursor)}
          endIcon={<ArrowRight size={14} strokeWidth={2} />}
        >
          {data ? `Open ${SCOPE_LABEL[data.scope].toLowerCase()} board` : 'Open board'}
        </Button>
      </Stack>
    </Drawer>
  )
}
