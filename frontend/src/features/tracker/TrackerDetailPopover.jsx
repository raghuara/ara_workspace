import { useState } from 'react'
import { Box, Drawer, IconButton, Popover, Stack, Typography } from '@mui/material'
import { Building2, ChevronRight, ClipboardList, MessageSquareWarning, X } from 'lucide-react'
import { StatusChip } from '@/components/StatusChip'
import { ToneChip } from '@/components/ToneChip'
import { UserAvatar } from '@/components/UserAvatar'
import { ListSectionSkeleton } from '@/components/Skeletons'
import { QueryStateView } from '@/components/QueryStateView'
import { taskService } from '@/api/taskService'
import { TaskDetailDrawer } from '@/features/workspace/components/TaskDetailDrawer'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { useAsync } from '@/hooks/useAsync'
import { colors } from '@/theme/tokens'
import { formatShortDate, overline } from './trackerModel'

const TICKET_TONES = { Complaint: 'rose', Requirement: 'blue', Change: 'violet', 'New request': 'teal', Other: 'slate' }
const TICKET_STATUS_TONES = { New: 'blue', 'In progress': 'amber', 'With client': 'violet', Completed: 'green', Reopened: 'rose' }
const TASK_LISTS = ['assigned', 'corrections', 'completed', 'inProgress', 'inReview', 'overdue']

const countRepeats = (ids) => {
  const counts = new Map()
  ids.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1))
  return [...counts]
}

const ItemRow = ({ icon: Icon, title, children, aside, onOpen }) => (
  <Stack
    direction="row"
    spacing={1.25}
    {...(onOpen
      ? {
          role: 'button',
          tabIndex: 0,
          onClick: onOpen,
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onOpen()
            }
          },
        }
      : {})}
    sx={{
      px: 1.75,
      py: 1,
      borderBottom: `1px solid ${colors.border}`,
      '&:last-of-type': { borderBottom: 0 },
      ...(onOpen
        ? {
            cursor: 'pointer',
            transition: 'background-color 120ms ease',
            '&:hover': { bgcolor: colors.brandSoft },
            '&:hover .row-open': { color: colors.brand, transform: 'translateX(2px)' },
            '&:focus-visible': { outline: `2px solid ${colors.brand}`, outlineOffset: '-2px' },
          }
        : {}),
    }}
  >
    <Box sx={{ mt: '2px', color: colors.textSecondary, flexShrink: 0 }}>
      <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
    </Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography
        variant="body2"
        sx={{ fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
      >
        {title}
      </Typography>
      <Stack direction="row" spacing={0.5} useFlexGap sx={{ mt: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
        {children}
      </Stack>
    </Box>
    {aside ? <Box sx={{ flexShrink: 0 }}>{aside}</Box> : null}
    {onOpen ? (
      <Box
        className="row-open"
        sx={{
          alignSelf: 'center',
          flexShrink: 0,
          color: colors.border,
          display: 'grid',
          transition: 'color 120ms ease, transform 120ms ease',
        }}
      >
        <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
      </Box>
    ) : null}
  </Stack>
)

const Meta = ({ children, tone }) => (
  <Typography variant="caption" sx={{ color: tone ? STATUS_TONES[tone].strong : colors.textSecondary, fontWeight: tone ? 600 : 400 }}>
    {children}
  </Typography>
)

const TaskItems = ({ ids, lookup, listKey, onOpenTask }) =>
  countRepeats(ids).map(([id, times]) => {
    const task = lookup.tasks.get(id)
    if (!task) return null
    const client = lookup.clients.get(task.clientId)
    return (
      <ItemRow
        key={id}
        icon={ClipboardList}
        title={task.title}
        onOpen={() => onOpenTask(id)}
        aside={times > 1 ? <ToneChip label={`×${times}`} tone="rose" /> : null}
      >
        {client ? <ToneChip label={client.name} tone={client.tone} /> : null}
        <StatusChip label={task.statusName} tone={task.statusTone} size="small" />
        {listKey === 'completed' && task.completedAt ? <Meta tone="green">Done {formatShortDate(task.completedAt)}</Meta> : null}
        {listKey === 'overdue' && task.dueDate ? <Meta tone="rose">Due {formatShortDate(task.dueDate)}</Meta> : null}
        {listKey !== 'overdue' && listKey !== 'completed' && task.dueDate ? <Meta>Due {formatShortDate(task.dueDate)}</Meta> : null}
      </ItemRow>
    )
  })

const SubHeading = ({ children, count }) => (
  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', px: 1.75, py: 0.75, bgcolor: colors.page, borderBottom: `1px solid ${colors.border}` }}>
    <Typography sx={{ ...overline, flex: 1 }}>{children}</Typography>
    <Typography sx={{ ...overline, color: colors.textPrimary }}>{count}</Typography>
  </Stack>
)

const ClientItems = ({ row, lookup }) => {
  const taskIds = new Set(TASK_LISTS.flatMap((key) => row.lists[key]))
  return [...row.lists.clients]
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
    .map((item) => {
      const client = lookup.clients.get(item.clientId)
      if (!client) return null
      const tasks = [...taskIds].filter((id) => lookup.tasks.get(id)?.clientId === client.id).length
      return (
        <ItemRow
          key={client.id}
          icon={Building2}
          title={client.name}
          aside={<ToneChip label={`${tasks} task${tasks === 1 ? '' : 's'}`} tone={tasks ? 'blue' : 'slate'} />}
        >
          {item.isPrimary ? <ToneChip label="Primary" tone="violet" /> : <ToneChip label="Support" tone="slate" />}
          {client.status !== 'Active' ? <ToneChip label={client.status} tone="amber" /> : null}
          {client.company ? <Meta>{client.company}</Meta> : null}
          {item.since ? <Meta>· since {formatShortDate(item.since)}</Meta> : null}
        </ItemRow>
      )
    })
}

const TicketItems = ({ ids, lookup }) =>
  ids.map((id) => {
    const ticket = lookup.tickets.get(id)
    if (!ticket) return null
    const client = lookup.clients.get(ticket.clientId)
    return (
      <ItemRow key={id} icon={MessageSquareWarning} title={ticket.title}>
        <ToneChip label={ticket.kind} tone={TICKET_TONES[ticket.kind] ?? 'slate'} />
        <StatusChip label={ticket.status} tone={TICKET_STATUS_TONES[ticket.status] ?? 'slate'} size="small" />
        {client ? <ToneChip label={client.name} tone={client.tone} /> : null}
        <Meta>
          {ticket.kind === 'Complaint' ? `Raised ${formatShortDate(ticket.createdAt)}` : `Completed ${formatShortDate(ticket.closedAt)}`}
        </Meta>
      </ItemRow>
    )
  })

const TrackerTaskDrawer = ({ taskId, onClose }) => {
  const task = useAsync(taskService.getTask, [taskId], { enabled: Boolean(taskId), keepPrevious: false })

  if (!taskId) return null
  if (task.data) return <TaskDetailDrawer task={task.data} onClose={onClose} onChanged={task.reload} />

  return (
    <Drawer
      anchor="right"
      open
      onClose={onClose}
      aria-label="Task details"
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 480 } } } }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', px: 2, py: 1.5, borderBottom: `1px solid ${colors.border}` }}>
        <Typography variant="body2" sx={{ flex: 1, fontWeight: 700 }}>
          Task details
        </Typography>
        <IconButton size="small" aria-label="Close task details" onClick={onClose}>
          <X size={16} strokeWidth={2} />
        </IconButton>
      </Stack>
      <Box sx={{ p: 2 }}>
        <QueryStateView error={task.error} onRetry={task.reload}>
          <ListSectionSkeleton rows={6} wide />
        </QueryStateView>
      </Box>
    </Drawer>
  )
}

export const TrackerDetailPopover = ({ detail, lookup, onClose }) => {
  const { anchorEl, row, metric, context } = detail ?? {}
  const tone = metric?.tone ? STATUS_TONES[metric.tone] : STATUS_TONES.slate
  const [taskId, setTaskId] = useState(null)

  const openTask = (id) => {
    setTaskId(id)
    onClose()
  }

  const showsTasks = Boolean(detail) && metric?.kind !== 'clients' && metric?.kind !== 'tickets'

  return (
    <>
      <Popover
        open={Boolean(detail)}
        anchorEl={anchorEl}
        onClose={onClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{ paper: { sx: { width: 380, maxWidth: 'calc(100vw - 24px)', borderRadius: 2.5, overflow: 'hidden' } } }}
      >
        {detail ? (
          <>
            <Stack
              direction="row"
              spacing={1.25}
              sx={{ alignItems: 'center', px: 1.75, py: 1.25, bgcolor: tone.soft, borderBottom: `1px solid ${tone.border}` }}
            >
              <UserAvatar name={row.fullName} size={32} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
                  {row.fullName}
                </Typography>
                <Typography variant="caption" component="p" noWrap sx={{ color: tone.strong, fontWeight: 600 }}>
                  {metric.label} · {row[metric.key]} · {context}
                </Typography>
              </Box>
              <IconButton size="small" aria-label="Close details" onClick={onClose}>
                <X size={14} strokeWidth={2} />
              </IconButton>
            </Stack>

            <Box sx={{ maxHeight: 380, overflowY: 'auto' }}>
              {metric.kind === 'total' ? (
                <>
                  {row.lists.assigned.length ? (
                    <>
                      <SubHeading count={row.lists.assigned.length}>New assigned</SubHeading>
                      <TaskItems ids={row.lists.assigned} lookup={lookup} listKey="assigned" onOpenTask={openTask} />
                    </>
                  ) : null}
                  {row.lists.corrections.length ? (
                    <>
                      <SubHeading count={row.lists.corrections.length}>Corrections</SubHeading>
                      <TaskItems ids={row.lists.corrections} lookup={lookup} listKey="corrections" onOpenTask={openTask} />
                    </>
                  ) : null}
                </>
              ) : metric.kind === 'clients' ? (
                <ClientItems row={row} lookup={lookup} />
              ) : metric.kind === 'tickets' ? (
                <TicketItems ids={row.lists[metric.key]} lookup={lookup} />
              ) : (
                <TaskItems ids={row.lists[metric.key]} lookup={lookup} listKey={metric.key} onOpenTask={openTask} />
              )}
            </Box>

            <Box sx={{ px: 1.75, py: 1, borderTop: `1px solid ${colors.border}`, bgcolor: colors.page }}>
              <Typography variant="caption" component="p" sx={{ color: colors.textSecondary }}>
                {metric.help}
              </Typography>
              {showsTasks ? (
                <Typography variant="caption" component="p" sx={{ mt: 0.375, color: colors.brand, fontWeight: 600 }}>
                  Click a task to open its full details.
                </Typography>
              ) : null}
            </Box>
          </>
        ) : null}
      </Popover>

      <TrackerTaskDrawer taskId={taskId} onClose={() => setTaskId(null)} />
    </>
  )
}
