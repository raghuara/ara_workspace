import { useMemo, useState } from 'react'
import {
  Box,
  Card,
  Divider,
  MenuItem,
  Stack,
  TablePagination,
  TextField,
  Tooltip,
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
import { taskService } from '@/api/taskService'
import { TaskDetailDrawer } from '@/features/workspace/components/TaskDetailDrawer'
import { HISTORY_ACTIONS } from '@/constants/workspaceDomain'
import { useAsync } from '@/hooks/useAsync'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePeriod } from '@/hooks/usePeriod'
import { useWorkspace } from '@/hooks/useWorkspace'
import { colors, layout } from '@/theme/tokens'
import { formatDate, formatRelativeDay, formatStamp, formatTime } from '@/utils/date'
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

const VERBS = {
  [HISTORY_ACTIONS.CREATED]: 'created',
  [HISTORY_ACTIONS.MOVED]: 'moved',
  [HISTORY_ACTIONS.UPDATED]: 'updated',
  [HISTORY_ACTIONS.ASSIGNED]: 'reassigned',
  [HISTORY_ACTIONS.COMPLETED]: 'completed',
  [HISTORY_ACTIONS.DELETED]: 'deleted',
  [HISTORY_ACTIONS.COMMENTED]: 'commented on',
}

// Most entries read "moved this task"; those become "moved <name>". Anything
// more specific ("deleted a comment by Priya") keeps its own wording.
const GENERIC_SUMMARY = /\bthis task\b|^marked this complete$/i

const phrasing = (entry) =>
  GENERIC_SUMMARY.test(entry.summary)
    ? { lead: VERBS[entry.action] ?? 'changed', joiner: '' }
    : { lead: entry.summary, joiner: ' on' }

const groupByDay = (items) => {
  const days = new Map()
  items.forEach((entry) => {
    const key = (entry.at ?? '').slice(0, 10)
    if (!days.has(key)) days.set(key, [])
    days.get(key).push(entry)
  })
  return [...days.entries()]
}

const timeOf = (value) => formatTime((value ?? '').slice(11, 16))

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

  const [focusTask, setFocusTask] = useState(null)

  const openTask = async (entry) => {
    try {
      setFocusTask(await taskService.getTask(entry.taskId))
    } catch {
      setFocusTask(null)
    }
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
              {groupByDay(data?.items ?? []).map(([day, entries]) => (
                <Box key={day}>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 1,
                      alignItems: 'center',
                      px: 2,
                      py: 0.875,
                      bgcolor: colors.page,
                      borderBottom: `1px solid ${colors.border}`,
                    }}
                  >
                    <Typography
                      sx={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}
                    >
                      {formatRelativeDay(day)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                      {formatDate(day)} · {pluralize(entries.length, 'change')}
                    </Typography>
                  </Stack>

                  {entries.map((entry) => {
                    const { lead, joiner } = phrasing(entry)
                    const openable = !entry.taskDeleted && Boolean(entry.taskId)

                    return (
                      <Stack
                        key={entry.id}
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1.5}
                        onClick={openable ? () => openTask(entry) : undefined}
                        sx={{
                          alignItems: { xs: 'flex-start', sm: 'center' },
                          px: 2,
                          py: 1.5,
                          cursor: openable ? 'pointer' : 'default',
                          borderBottom: `1px solid ${colors.border}`,
                          '&:last-of-type': { borderBottom: 0 },
                          '&:hover': { bgcolor: openable ? colors.page : 'transparent' },
                        }}
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
                          <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                            <Box component="span" sx={{ fontWeight: 650 }}>
                              {entry.actorName}
                            </Box>{' '}
                            <Box component="span" sx={{ color: colors.textSecondary }}>
                              {lead}
                              {joiner}
                            </Box>{' '}
                            <Box
                              component="span"
                              sx={{
                                fontWeight: 650,
                                color: entry.taskDeleted ? colors.textSecondary : colors.textPrimary,
                                textDecoration: entry.taskDeleted ? 'line-through' : 'none',
                              }}
                            >
                              {entry.taskTitle}
                            </Box>
                          </Typography>

                          <Stack
                            direction="row"
                            spacing={0.75}
                            useFlexGap
                            sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 0.5 }}
                          >
                            <ToneChip label={entry.action} tone={ACTION_TONES[entry.action] ?? 'slate'} />
                            <ToneChip label={entry.clientName} tone={entry.clientTone} />
                            {entry.taskDeleted ? (
                              <Tooltip title="The task was deleted — this entry is kept">
                                <Box sx={{ display: 'inline-flex' }}>
                                  <ToneChip label="task deleted" tone="rose" />
                                </Box>
                              </Tooltip>
                            ) : null}
                            {detailText(entry) ? (
                              <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                                {detailText(entry)}
                              </Typography>
                            ) : null}
                          </Stack>
                        </Box>

                        <Tooltip title={formatStamp(entry.at)}>
                          <Typography variant="caption" sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                            {timeOf(entry.at)}
                          </Typography>
                        </Tooltip>
                      </Stack>
                    )
                  })}
                </Box>
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

      {focusTask ? (
        <TaskDetailDrawer task={focusTask} onClose={() => setFocusTask(null)} onChanged={reload} />
      ) : null}
    </Box>
  )
}
