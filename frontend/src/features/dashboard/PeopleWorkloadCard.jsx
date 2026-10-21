import { useMemo, useState } from 'react'
import { Box, Button, Stack, Tooltip, Typography } from '@mui/material'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/SectionCard'
import { EmptyState } from '@/components/EmptyState'
import { ListSectionSkeleton } from '@/components/Skeletons'
import { ToneChip } from '@/components/ToneChip'
import { UserAvatar } from '@/components/UserAvatar'
import { QueryStateView } from '@/components/QueryStateView'
import { dashboardService } from '@/api/dashboardService'
import { taskService } from '@/api/taskService'
import { PERMISSIONS } from '@/constants/permissions'
import { ROUTES } from '@/constants/routes'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { useAsync } from '@/hooks/useAsync'
import { usePermissions } from '@/hooks/usePermissions'
import { colors } from '@/theme/tokens'

const SORTS = [
  { key: 'points', label: 'Points earned' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'open', label: 'Open now' },
]

const HEAD = {
  fontSize: '0.6875rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: colors.textSecondary,
}

const COLUMNS = '28px minmax(0, 1fr) 54px 64px 54px 96px 18px'

const Metric = ({ value, tone }) => (
  <Typography
    variant="body2"
    sx={{
      textAlign: 'right',
      fontWeight: value > 0 && tone ? 700 : 500,
      color: value > 0 && tone ? STATUS_TONES[tone].strong : colors.textPrimary,
      fontVariantNumeric: 'tabular-nums',
    }}
  >
    {value}
  </Typography>
)

export const PeopleWorkloadCard = ({ workspaceId, workspaceName, range, periodLabel, onSelectPerson }) => {
  const { can } = usePermissions()
  const [sort, setSort] = useState('points')

  const scopeArgs = useMemo(() => ({ ...range }), [range])
  const summary = useAsync(dashboardService.getScopeSummary, [workspaceId, scopeArgs], {
    enabled: Boolean(workspaceId),
  })
  const workload = useAsync(taskService.getWorkloadReport, [workspaceId, scopeArgs], {
    enabled: Boolean(workspaceId) && can(PERMISSIONS.REPORT_VIEW),
  })

  const people = useMemo(() => {
    const members = summary.data?.members ?? []
    const byId = new Map((workload.data?.rows ?? []).map((row) => [row.employeeId, row]))

    return members
      .map((member) => {
        const row = byId.get(member.id)
        return {
          id: member.id,
          fullName: member.fullName,
          designation: member.designation,
          teamName: member.teamName,
          role: member.role,
          open: member.open ?? 0,
          overdue: member.overdue ?? 0,
          completed: row?.completedTasks ?? member.completed ?? 0,
          points: row?.completedPoints ?? member.completedPoints ?? 0,
          share: row?.pointShare ?? 0,
        }
      })
      .filter((person) => person.open > 0 || person.completed > 0 || person.overdue > 0)
  }, [summary.data, workload.data])

  const sorted = useMemo(() => {
    const list = [...people]
    if (sort === 'overdue') return list.sort((a, b) => b.overdue - a.overdue || b.open - a.open)
    if (sort === 'open') return list.sort((a, b) => b.open - a.open || b.points - a.points)
    return list.sort((a, b) => b.points - a.points || b.completed - a.completed)
  }, [people, sort])

  const topPoints = sorted.reduce((top, person) => Math.max(top, person.points), 0) || 1
  const loading = summary.loading && !summary.data

  return (
    <SectionCard
      title="People"
      description={`${workspaceName} · who is carrying the work in ${periodLabel}`}
      accent="violet"
      padded={false}
      action={
        can(PERMISSIONS.REPORT_VIEW) ? (
          <Button
            component={Link}
            to={ROUTES.reports}
            size="small"
            variant="text"
            endIcon={<ArrowRight size={14} strokeWidth={2} />}
          >
            Workload report
          </Button>
        ) : null
      }
    >
      <Stack direction="row" spacing={0.75} sx={{ px: 1.75, py: 1.25, borderBottom: `1px solid ${colors.border}` }}>
        <Typography variant="caption" sx={{ alignSelf: 'center', color: colors.textSecondary, mr: 0.5 }}>
          Sort by
        </Typography>
        {SORTS.map((option) => (
          <Box
            key={option.key}
            component="button"
            type="button"
            onClick={() => setSort(option.key)}
            aria-pressed={sort === option.key}
            sx={{
              height: 26,
              px: 1.125,
              border: `1px solid ${sort === option.key ? colors.brand : colors.border}`,
              borderRadius: 999,
              bgcolor: sort === option.key ? colors.brandSoft : colors.surface,
              color: sort === option.key ? colors.brandDark : colors.textPrimary,
              font: 'inherit',
              fontSize: '0.75rem',
              fontWeight: sort === option.key ? 650 : 500,
              cursor: 'pointer',
            }}
          >
            {option.label}
          </Box>
        ))}
      </Stack>

      <QueryStateView error={summary.error} onRetry={summary.reload}>
        {loading ? (
          <Box sx={{ p: 2 }}>
            <ListSectionSkeleton rows={4} />
          </Box>
        ) : sorted.length === 0 ? (
          <EmptyState title="Nobody with work yet" description="People appear here once tasks are assigned to them." />
        ) : (
          <>
            <Box
              sx={{
                display: { xs: 'none', sm: 'grid' },
                gridTemplateColumns: COLUMNS,
                gap: 1,
                px: 1.75,
                py: 0.875,
                bgcolor: colors.page,
                borderBottom: `1px solid ${colors.border}`,
              }}
            >
              <Typography sx={HEAD}>#</Typography>
              <Typography sx={HEAD}>Person</Typography>
              <Typography sx={{ ...HEAD, textAlign: 'right' }}>Open</Typography>
              <Typography sx={{ ...HEAD, textAlign: 'right' }}>Overdue</Typography>
              <Typography sx={{ ...HEAD, textAlign: 'right' }}>Done</Typography>
              <Typography sx={{ ...HEAD, textAlign: 'right' }}>Points</Typography>
              <Box />
            </Box>

            <Box sx={{ maxHeight: 420, overflowY: 'auto' }}>
              {sorted.map((person, index) => (
                <Box
                  key={person.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectPerson(person)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onSelectPerson(person)
                    }
                  }}
                  aria-label={`Open ${person.fullName}`}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '28px minmax(0, 1fr) auto 18px', sm: COLUMNS },
                    gap: 1,
                    alignItems: 'center',
                    px: 1.75,
                    py: 1,
                    cursor: 'pointer',
                    borderBottom: `1px solid ${colors.border}`,
                    '&:last-of-type': { borderBottom: 0 },
                    '&:hover': { bgcolor: colors.page },
                    '&:focus-visible': { outline: 'none', boxShadow: `inset 0 0 0 2px ${colors.brand}` },
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, color: colors.textSecondary, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {index + 1}
                  </Typography>

                  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
                    <UserAvatar name={person.fullName} size={30} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                        {person.fullName}
                      </Typography>
                      <Typography variant="caption" component="p" noWrap>
                        {[person.designation, person.teamName].filter((item) => item && item !== '—').join(' · ')}
                      </Typography>
                    </Box>
                  </Stack>

                  <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                    <Metric value={person.open} />
                  </Box>
                  <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                    <Metric value={person.overdue} tone="rose" />
                  </Box>
                  <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                    <Metric value={person.completed} />
                  </Box>

                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
                    <Box sx={{ display: { xs: 'none', sm: 'block' }, flex: 1, minWidth: 0 }}>
                      <Tooltip title={`${person.share}% of the points completed`}>
                        <Box sx={{ height: 6, borderRadius: 999, bgcolor: colors.neutralSoft, overflow: 'hidden' }}>
                          <Box
                            sx={{
                              width: `${Math.round((person.points / topPoints) * 100)}%`,
                              height: '100%',
                              borderRadius: 999,
                              bgcolor: colors.brand,
                            }}
                          />
                        </Box>
                      </Tooltip>
                    </Box>
                    <ToneChip label={`${person.points}`} tone="teal" />
                  </Stack>

                  <ChevronRight size={15} strokeWidth={2} color={colors.textSecondary} aria-hidden="true" />
                </Box>
              ))}
            </Box>
          </>
        )}
      </QueryStateView>
    </SectionCard>
  )
}
