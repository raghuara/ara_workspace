import { Box, Button, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { ArrowRight, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/SectionCard'
import { ToneChip } from '@/components/ToneChip'
import { UserAvatar } from '@/components/UserAvatar'
import { EmptyState } from '@/components/EmptyState'
import { QueryStateView } from '@/components/QueryStateView'
import { TableSectionSkeleton } from '@/components/Skeletons'
import { activityService } from '@/api/activityService'
import { ROUTES } from '@/constants/routes'
import { HISTORY_ACTIONS } from '@/constants/workspaceDomain'
import { useAsync } from '@/hooks/useAsync'
import { colors } from '@/theme/tokens'

const ACTION_TONES = {
  [HISTORY_ACTIONS.CREATED]: 'blue',
  [HISTORY_ACTIONS.MOVED]: 'violet',
  [HISTORY_ACTIONS.UPDATED]: 'amber',
  [HISTORY_ACTIONS.ASSIGNED]: 'teal',
  [HISTORY_ACTIONS.COMPLETED]: 'green',
  [HISTORY_ACTIONS.DELETED]: 'rose',
}

const timeAgo = (iso) => {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const minutes = Math.round((Date.now() - then) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

export const RecentActivityTable = ({ workspaceId, range, limit = 6, canView = true }) => {
  const activity = useAsync(activityService.listActivity, [{ workspaceId, ...range, page: 1, pageSize: limit }], {
    enabled: canView && Boolean(workspaceId),
  })

  if (!canView) return null
  if (activity.loading && !activity.data) return <TableSectionSkeleton rows={limit > 5 ? 5 : limit} />

  const items = activity.data?.items ?? []

  return (
    <SectionCard
      title="Recent activity"
      description="Latest changes across the workspace"
      accent="blue"
      padded={false}
      action={
        <Button component={Link} to={ROUTES.activity} size="small" endIcon={<ArrowRight size={14} strokeWidth={2} />}>
          View all
        </Button>
      }
    >
      <QueryStateView error={activity.error} onRetry={activity.reload}>
        {items.length === 0 ? (
          <EmptyState title="Nothing yet" description="Changes to tasks will show up here." />
        ) : (
          <TableContainer>
            <Table size="small" sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Task</TableCell>
                  <TableCell>By</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell align="right">When</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((entry) => (
                  <TableRow key={entry.id} hover>
                    <TableCell sx={{ maxWidth: 320 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {entry.taskTitle}
                      </Typography>
                      <Typography variant="caption" component="p" noWrap>
                        {entry.summary}
                        {entry.detail?.from && entry.detail?.to ? ` · ${entry.detail.from} → ${entry.detail.to}` : ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        {entry.isAutomation ? (
                          <Box sx={{ width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: colors.brandSoft, color: colors.brand }}>
                            <Zap size={12} strokeWidth={1.75} aria-hidden="true" />
                          </Box>
                        ) : (
                          <UserAvatar name={entry.actorName} size={24} />
                        )}
                        <Typography variant="body2" noWrap>
                          {entry.actorName}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <ToneChip label={entry.action} tone={ACTION_TONES[entry.action] ?? 'slate'} />
                    </TableCell>
                    <TableCell>
                      <ToneChip label={entry.clientName} tone={entry.clientTone} />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
                        {timeAgo(entry.at)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </QueryStateView>
    </SectionCard>
  )
}
