import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import { CalendarCheck, Ellipsis, Pause, Pencil, Play, Plus, Repeat, Search, Trash2, Users } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SectionCard } from '@/components/SectionCard'
import { StatCard } from '@/components/StatCard'
import { EmptyState } from '@/components/EmptyState'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { QueryStateView } from '@/components/QueryStateView'
import { ToneChip } from '@/components/ToneChip'
import { UserAvatar } from '@/components/UserAvatar'
import { TableSectionSkeleton, StatTileSkeleton } from '@/components/Skeletons'
import { recurringTaskService } from '@/api/recurringTaskService'
import { PERMISSIONS } from '@/constants/permissions'
import { DUE_OFFSETS, PRIORITY_TONES } from '@/constants/workspaceDomain'
import { useAsync } from '@/hooks/useAsync'
import { usePermissions } from '@/hooks/usePermissions'
import { useWorkspace } from '@/hooks/useWorkspace'
import { colors, layout } from '@/theme/tokens'
import { formatDate, formatRelativeDay } from '@/utils/date'
import { describeSchedule, nextOccurrences, todayIso } from '@/utils/recurrence'
import { RecurringTaskDialog } from './components/RecurringTaskDialog'
import { ScheduleBadges } from './components/ScheduleBadges'

const dueLabel = (offset) => DUE_OFFSETS.find((option) => option.value === offset)?.label ?? `In ${offset} days`

const nextRunFor = (rule) => {
  if (!rule.isActive) return null
  if (rule.nextRunOn) return rule.nextRunOn
  const from = rule.startDate && rule.startDate > todayIso() ? rule.startDate : todayIso()
  return nextOccurrences(rule.schedule, { from, endDate: rule.endDate, count: 1 })[0] ?? null
}

const Assignees = ({ rule }) => {
  const people = rule.assignees ?? rule.assigneeIds.map((id) => ({ id, fullName: id }))
  const shown = people.slice(0, 3)
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
      <Stack direction="row" sx={{ '& > *:not(:first-of-type)': { ml: -0.75 } }}>
        {shown.map((person) => (
          <Tooltip key={person.id} title={person.fullName}>
            <Box sx={{ borderRadius: '50%', border: `2px solid ${colors.surface}` }}>
              <UserAvatar name={person.fullName} size={26} />
            </Box>
          </Tooltip>
        ))}
      </Stack>
      <Typography variant="caption" noWrap>
        {people.length > 3 ? `+${people.length - 3} · ` : ''}
        {rule.perAssignee ? 'one each' : 'shared'}
      </Typography>
    </Stack>
  )
}

const RowMenu = ({ rule, canEdit, onEdit, onToggle, onDelete }) => {
  const [anchor, setAnchor] = useState(null)
  if (!canEdit) return null
  return (
    <>
      <IconButton size="small" aria-label={`Actions for ${rule.title}`} onClick={(event) => setAnchor(event.currentTarget)}>
        <Ellipsis size={16} strokeWidth={2} />
      </IconButton>
      <Menu open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => { setAnchor(null); onEdit(rule) }}>
          <ListItemIcon><Pencil size={15} strokeWidth={1.75} /></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setAnchor(null); onToggle(rule) }}>
          <ListItemIcon>{rule.isActive ? <Pause size={15} strokeWidth={1.75} /> : <Play size={15} strokeWidth={1.75} />}</ListItemIcon>
          <ListItemText>{rule.isActive ? 'Pause' : 'Resume'}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setAnchor(null); onDelete(rule) }} sx={{ color: colors.danger }}>
          <ListItemIcon sx={{ color: 'inherit' }}><Trash2 size={15} strokeWidth={1.75} /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}

export const RecurringTasksPage = () => {
  const { can } = usePermissions()
  const { activeWorkspace, activeWorkspaceId } = useWorkspace()
  const canEdit = can(PERMISSIONS.TASK_CREATE)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [dialog, setDialog] = useState({ open: false, rule: null })
  const [deleting, setDeleting] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const rules = useAsync(recurringTaskService.list, [activeWorkspaceId], { enabled: Boolean(activeWorkspaceId) })
  const items = useMemo(() => (Array.isArray(rules.data) ? rules.data : (rules.data?.items ?? [])), [rules.data])

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return items
      .filter((rule) => (status === 'all' ? true : status === 'active' ? rule.isActive : !rule.isActive))
      .filter((rule) => !needle || `${rule.title} ${rule.clientName ?? ''} ${rule.groupName ?? ''} ${rule.teamName ?? ''}`.toLowerCase().includes(needle))
      .map((rule) => ({ ...rule, nextRun: nextRunFor(rule) }))
      .sort((a, b) => Number(b.isActive) - Number(a.isActive) || (a.nextRun ?? '9').localeCompare(b.nextRun ?? '9'))
  }, [items, search, status])

  const stats = useMemo(() => {
    const active = items.filter((rule) => rule.isActive)
    const weekAhead = new Date()
    weekAhead.setDate(weekAhead.getDate() + 7)
    const cutoff = weekAhead.toISOString().slice(0, 10)
    const runsThisWeek = active.reduce(
      (sum, rule) => sum + nextOccurrences(rule.schedule, { from: todayIso(), endDate: rule.endDate, count: 7 }).filter((day) => day <= cutoff).length * (rule.perAssignee ? rule.assigneeIds.length : 1),
      0,
    )
    const soonest = active.map(nextRunFor).filter(Boolean).sort()[0] ?? null
    return {
      active: active.length,
      paused: items.length - active.length,
      created: items.reduce((sum, rule) => sum + (rule.createdCount ?? 0), 0),
      runsThisWeek,
      soonest,
    }
  }, [items])

  const toggle = async (rule) => {
    setBusyId(rule.id)
    try {
      await recurringTaskService.setActive(rule.id, !rule.isActive)
      rules.reload()
    } finally {
      setBusyId(null)
    }
  }

  const remove = async () => {
    if (!deleting) return
    setBusyId(deleting.id)
    try {
      await recurringTaskService.remove(deleting.id)
      setDeleting(null)
      rules.reload()
    } finally {
      setBusyId(null)
    }
  }

  const loading = rules.loading && !rules.data

  return (
    <Box sx={{ maxWidth: layout.wideMaxWidth, mx: 'auto', px: { xs: 1.5, sm: 2, md: 3, lg: 4 }, py: { xs: 1.5, md: 2.5 } }}>
      <PageHeader
        title="Recurring tasks"
        description={`Tasks that create themselves on a schedule in ${activeWorkspace?.name ?? 'this workspace'} — every day, chosen weekdays, or set dates each month.`}
        breadcrumbs={[{ label: 'Work' }, { label: 'Recurring' }]}
        actions={
          canEdit ? (
            <Button variant="contained" startIcon={<Plus size={16} strokeWidth={2} />} onClick={() => setDialog({ open: true, rule: null })}>
              New recurring task
            </Button>
          ) : null
        }
      />

      <Box sx={{ display: 'grid', gap: 1.25, mb: 1.5, gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' } }}>
        {loading ? (
          [0, 1, 2, 3].map((index) => <StatTileSkeleton key={index} />)
        ) : (
          <>
            <StatCard dense label="Active" value={stats.active} helperText={stats.paused ? `${stats.paused} paused` : 'none paused'} icon={Repeat} tone="blue" />
            <StatCard dense label="Due this week" value={stats.runsThisWeek} helperText="tasks that will be created" icon={CalendarCheck} tone="teal" />
            <StatCard dense label="Next run" value={stats.soonest ? formatRelativeDay(stats.soonest) : '—'} helperText={stats.soonest ? formatDate(stats.soonest) : 'nothing scheduled'} icon={Play} tone="violet" />
            <StatCard dense label="Created so far" value={stats.created} helperText="tasks from all rules" icon={Users} tone="orange" />
          </>
        )}
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', mb: 1.5 }}>
        <TextField
          size="small"
          placeholder="Search by title, client, group or team"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ maxWidth: { sm: 360 }, flex: 1 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={15} strokeWidth={1.75} />
                </InputAdornment>
              ),
            },
          }}
        />
        <ToggleButtonGroup exclusive size="small" value={status} onChange={(_, next) => next && setStatus(next)} aria-label="Filter by status">
          <ToggleButton value="all" sx={{ textTransform: 'none', px: 1.5 }}>All</ToggleButton>
          <ToggleButton value="active" sx={{ textTransform: 'none', px: 1.5 }}>Active</ToggleButton>
          <ToggleButton value="paused" sx={{ textTransform: 'none', px: 1.5 }}>Paused</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <QueryStateView error={rules.error} onRetry={rules.reload}>
        {loading ? (
          <TableSectionSkeleton rows={4} columns={6} />
        ) : items.length === 0 ? (
          <SectionCard padded={false}>
            <EmptyState
              icon={Repeat}
              title="No recurring tasks yet"
              description="Anything the team does again and again — a daily post, a Monday report, an invoice run on the 1st — set it up once and it will appear in To Do on schedule."
              actionLabel={canEdit ? 'Create the first one' : undefined}
              onAction={canEdit ? () => setDialog({ open: true, rule: null }) : undefined}
            />
          </SectionCard>
        ) : (
          <SectionCard padded={false} title={`${visible.length} of ${items.length} rules`} description="Newest runs first · paused rules sink to the bottom" accent="blue">
            {visible.length === 0 ? (
              <EmptyState title="Nothing matches" description="Try a different search or status." />
            ) : (
              <>
                <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
                  <Table size="small" sx={{ minWidth: 900 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Task</TableCell>
                        <TableCell>Schedule</TableCell>
                        <TableCell>People</TableCell>
                        <TableCell>Due</TableCell>
                        <TableCell>Next run</TableCell>
                        <TableCell align="right">Created</TableCell>
                        <TableCell>Active</TableCell>
                        <TableCell align="right" />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {visible.map((rule) => (
                        <TableRow key={rule.id} hover sx={{ opacity: rule.isActive ? 1 : 0.6 }}>
                          <TableCell sx={{ maxWidth: 320 }}>
                            <Typography variant="body2" fontWeight={600} noWrap>
                              {rule.title}
                            </Typography>
                            <Stack direction="row" spacing={0.5} sx={{ mt: 0.375, flexWrap: 'wrap' }} useFlexGap>
                              {rule.clientName ? <ToneChip label={rule.clientName} tone={rule.clientTone ?? 'slate'} /> : null}
                              {rule.groupName ? <ToneChip label={rule.teamName && rule.teamName !== '—' ? `${rule.groupName} · ${rule.teamName}` : rule.groupName} tone={rule.groupTone ?? 'slate'} /> : null}
                              <ToneChip label={rule.priority} tone={PRIORITY_TONES[rule.priority] ?? 'gray'} />
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ minWidth: 190 }}>
                            <ScheduleBadges schedule={rule.schedule} />
                          </TableCell>
                          <TableCell>
                            <Assignees rule={rule} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{dueLabel(rule.dueOffsetDays)}</Typography>
                          </TableCell>
                          <TableCell>
                            {rule.nextRun ? (
                              <>
                                <Typography variant="body2" fontWeight={600}>
                                  {formatRelativeDay(rule.nextRun)}
                                </Typography>
                                <Typography variant="caption" component="p">
                                  {formatDate(rule.nextRun)}
                                  {rule.endDate ? ` · until ${formatDate(rule.endDate)}` : ''}
                                </Typography>
                              </>
                            ) : (
                              <Typography variant="caption">{rule.isActive ? 'No upcoming run' : 'Paused'}</Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                              {rule.createdCount ?? 0}
                            </Typography>
                            {rule.lastRunOn ? (
                              <Typography variant="caption" component="p">
                                last {formatRelativeDay(rule.lastRunOn).toLowerCase()}
                              </Typography>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Switch
                              size="small"
                              checked={rule.isActive}
                              disabled={!canEdit || busyId === rule.id}
                              onChange={() => toggle(rule)}
                              slotProps={{ input: { 'aria-label': `${rule.isActive ? 'Pause' : 'Resume'} ${rule.title}` } }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <RowMenu rule={rule} canEdit={canEdit} onEdit={(target) => setDialog({ open: true, rule: target })} onToggle={toggle} onDelete={setDeleting} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Stack sx={{ display: { xs: 'flex', md: 'none' } }}>
                  {visible.map((rule) => (
                    <Box key={rule.id} sx={{ px: 1.75, py: 1.25, borderBottom: `1px solid ${colors.border}`, opacity: rule.isActive ? 1 : 0.6 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {rule.title}
                          </Typography>
                          <Typography variant="caption" component="p" noWrap>
                            {describeSchedule(rule.schedule)} · due {dueLabel(rule.dueOffsetDays).toLowerCase()}
                          </Typography>
                        </Box>
                        <Switch size="small" checked={rule.isActive} disabled={!canEdit || busyId === rule.id} onChange={() => toggle(rule)} />
                        <RowMenu rule={rule} canEdit={canEdit} onEdit={(target) => setDialog({ open: true, rule: target })} onToggle={toggle} onDelete={setDeleting} />
                      </Stack>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 0.75 }}>
                        <ScheduleBadges schedule={rule.schedule} dense />
                        <Assignees rule={rule} />
                      </Stack>
                      <Typography variant="caption" component="p" sx={{ mt: 0.5 }}>
                        {rule.nextRun ? `Next ${formatRelativeDay(rule.nextRun).toLowerCase()} · ${formatDate(rule.nextRun)}` : rule.isActive ? 'No upcoming run' : 'Paused'}
                        {' · '}
                        {rule.createdCount ?? 0} created
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </>
            )}
          </SectionCard>
        )}
      </QueryStateView>

      {dialog.open ? (
        <RecurringTaskDialog
          key={dialog.rule?.id ?? 'new'}
          rule={dialog.rule}
          onClose={() => setDialog({ open: false, rule: null })}
          onSaved={() => rules.reload()}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this recurring task?"
        description={deleting ? `"${deleting.title}" will stop being created. Tasks it already created stay on the board.` : ''}
        confirmLabel="Delete"
        confirming={Boolean(deleting) && busyId === deleting.id}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </Box>
  )
}
