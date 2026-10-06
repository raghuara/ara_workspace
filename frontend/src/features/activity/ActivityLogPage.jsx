import { useMemo, useState } from 'react'
import {
  Box,
  Card,
  Divider,
  MenuItem,
  Stack,
  TablePagination,
  TextField,
  Typography,
} from '@mui/material'
import { History, Zap } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { MonthPicker } from '@/components/MonthPicker'
import { SearchField } from '@/components/SearchField'
import { EmptyState } from '@/components/EmptyState'
import { QueryStateView } from '@/components/QueryStateView'
import { ToneChip } from '@/components/ToneChip'
import { UserAvatar } from '@/components/UserAvatar'
import { activityService } from '@/api/activityService'
import { HISTORY_ACTIONS } from '@/constants/workspaceDomain'
import { useAsync } from '@/hooks/useAsync'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePeriod } from '@/hooks/usePeriod'
import { useWorkspace } from '@/hooks/useWorkspace'
import { colors, layout } from '@/theme/tokens'
import { formatStamp } from '@/utils/date'
import { pluralize } from '@/utils/format'

const ACTION_TONES = {
  [HISTORY_ACTIONS.CREATED]: 'blue',
  [HISTORY_ACTIONS.MOVED]: 'violet',
  [HISTORY_ACTIONS.UPDATED]: 'amber',
  [HISTORY_ACTIONS.ASSIGNED]: 'teal',
  [HISTORY_ACTIONS.COMPLETED]: 'green',
  [HISTORY_ACTIONS.DELETED]: 'rose',
  [HISTORY_ACTIONS.COMMENTED]: 'slate',
}

const clip = (value) => {
  const flat = value.replace(/\s+/g, ' ')
  return flat.length > 120 ? `${flat.slice(0, 119)}…` : flat
}

const detailText = (entry) => {
  if (!entry.detail) return null
  if (entry.detail.after) return `“${clip(entry.detail.after)}”`
  if (entry.detail.before) return `Removed: “${clip(entry.detail.before)}”`
  if (entry.detail.excerpt) return `“${entry.detail.excerpt}”`
  if (entry.detail.from && entry.detail.to) return `${entry.detail.from} → ${entry.detail.to}`
  if (entry.detail.fields) return `Changed: ${entry.detail.fields.join(', ')}`
  return null
}

export const ActivityLogPage = () => {
  const { activeWorkspaceId, activeWorkspace } = useWorkspace()
  const { range, periodLabel } = usePeriod()
  const periodKey = `${range.from}|${range.to}`

  const [search, setSearch] = useState('')
  const [action, setAction] = useState('')
  const [actorId, setActorId] = useState('')
  const [paging, setPaging] = useState({ key: periodKey, page: 0 })
  const page = paging.key === periodKey ? paging.page : 0
  const setPage = (next) => setPaging({ key: periodKey, page: next })
  const [pageSize, setPageSize] = useState(25)

  const debouncedSearch = useDebouncedValue(search, 300)

  const actors = useAsync(activityService.listActors, [activeWorkspaceId], {
    enabled: Boolean(activeWorkspaceId),
  })

  const query = useMemo(
    () => ({
      workspaceId: activeWorkspaceId,
      search: debouncedSearch,
      action,
      actorId,
      from: range.from,
      to: range.to,
      page: page + 1,
      pageSize,
    }),
    [activeWorkspaceId, debouncedSearch, action, actorId, range.from, range.to, page, pageSize],
  )

  const { data, loading, error, reload } = useAsync(activityService.listActivity, [query], {
    enabled: Boolean(activeWorkspaceId),
  })

  const resetPage = (setter) => (event) => {
    setter(event.target.value)
    setPage(0)
  }

  return (
    <Box sx={{ maxWidth: layout.contentMaxWidth, mx: 'auto', px: { xs: 2, md: 3, lg: 4 }, py: { xs: 3, md: 4 } }}>
      <PageHeader
        title="Activity Log"
        description={`Every change made across ${activeWorkspace?.name ?? 'this workspace'} in ${periodLabel} — who did it, what changed and when.`}
        breadcrumbs={[{ label: 'Activity Log' }]}
      />

      <Card>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ p: 2 }}>
          <MonthPicker />
          <SearchField
            value={search}
            onChange={(value) => {
              setSearch(value)
              setPage(0)
            }}
            label="Search activity"
            placeholder="Search task or person…"
          />
          <TextField select size="small" label="Action" value={action} onChange={resetPage(setAction)} sx={{ minWidth: 160 }}>
            <MenuItem value="">All actions</MenuItem>
            {Object.values(HISTORY_ACTIONS).map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="Person" value={actorId} onChange={resetPage(setActorId)} sx={{ minWidth: 190 }}>
            <MenuItem value="">Everyone</MenuItem>
            {(actors.data ?? []).map((actor) => (
              <MenuItem key={actor.id} value={actor.id}>
                {actor.fullName}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <Divider />

        <QueryStateView error={error} onRetry={reload}>
          {loading && !data ? (
            <Box sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Loading activity…
              </Typography>
            </Box>
          ) : data?.items?.length === 0 ? (
            <EmptyState icon={History} title="No activity found" description="Nothing matches the current filters." />
          ) : (
            <Box>
              {data?.items?.map((entry) => (
                <Stack
                  key={entry.id}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, px: 2,
                    py: 1.5,
                    borderBottom: `1px solid ${colors.border}`,
                    '&:last-of-type': { borderBottom: 0 },
                    '&:hover': { bgcolor: colors.page }, }}
                >
                  {entry.isAutomation ? (
                    <Box
                      aria-hidden="true"
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: colors.brandSoft,
                        color: colors.brand,
                        flexShrink: 0,
                      }}
                    >
                      <Zap size={15} strokeWidth={1.75} />
                    </Box>
                  ) : (
                    <UserAvatar name={entry.actorName} size={32} />
                  )}

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack
                      direction="row"
                      spacing={0.75}
                      useFlexGap
                      sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                    >
                      <Typography variant="body2" fontWeight={600}>
                        {entry.actorName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {entry.summary}
                      </Typography>
                      <ToneChip label={entry.action} tone={ACTION_TONES[entry.action] ?? 'slate'} />
                    </Stack>
                    <Stack
                      direction="row"
                      spacing={0.75}
                      useFlexGap
                      sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 0.5 }}
                    >
                      <Typography variant="caption" fontWeight={600}>
                        {entry.taskTitle}
                      </Typography>
                      <ToneChip label={entry.clientName} tone={entry.clientTone} />
                      {detailText(entry) ? (
                        <Typography variant="caption">{detailText(entry)}</Typography>
                      ) : null}
                    </Stack>
                  </Box>

                  <Typography variant="caption" sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {formatStamp(entry.at)}
                  </Typography>
                </Stack>
              ))}
            </Box>
          )}

          {data?.total ? (
            <>
              <Divider />
              <TablePagination
                component="div"
                count={data.total}
                page={page}
                onPageChange={(_, next) => setPage(next)}
                rowsPerPage={pageSize}
                onRowsPerPageChange={(event) => {
                  setPageSize(Number(event.target.value))
                  setPage(0)
                }}
                rowsPerPageOptions={[25, 50, 100]}
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} of ${pluralize(count, 'entry', 'entries')}`}
              />
            </>
          ) : null}
        </QueryStateView>
      </Card>
    </Box>
  )
}
