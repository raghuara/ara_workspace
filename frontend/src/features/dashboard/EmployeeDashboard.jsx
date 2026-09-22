import { useRef, useState } from 'react'
import { Box, Button, Skeleton, Stack, Tooltip, Typography } from '@mui/material'
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleCheck,
  ClipboardList,
  Clock3,
  Flag,
  RotateCcw,
  TriangleAlert,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/SectionCard'
import { StatCard } from '@/components/StatCard'
import { EmptyState } from '@/components/EmptyState'
import { QueryStateView } from '@/components/QueryStateView'
import { StatusChip } from '@/components/StatusChip'
import { ToneChip } from '@/components/ToneChip'
import { ListSectionSkeleton, StatTileSkeleton } from '@/components/Skeletons'
import { TaskDetailDrawer } from '@/features/workspace/components/TaskDetailDrawer'
import { TaskFormDialog } from '@/features/workspace/components/TaskFormDialog'
import { taskService } from '@/api/taskService'
import { workspaceViewPath } from '@/constants/routes'
import { PRIORITY_TONES, STATUS_TONES } from '@/constants/workspaceDomain'
import { useAsync } from '@/hooks/useAsync'
import { useSession } from '@/hooks/useSession'
import { usePeriod } from '@/hooks/usePeriod'
import { useWorkspace } from '@/hooks/useWorkspace'
import { colors } from '@/theme/tokens'
import { daysUntil, formatDate, formatLongDate, parseIsoDate } from '@/utils/date'
import { MONTH_NAMES, monthRange } from '@/utils/fiscalYear'
import { StatusSplitBar } from './StatusSplitBar'

const GAP = 1.5
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const focusRing = { outline: 'none', boxShadow: `0 0 0 2px ${colors.surface}, 0 0 0 4px ${colors.brand}` }
const overline = { fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }

const localDay = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const shortMonth = (date) => MONTH_NAMES[date.getMonth()].slice(0, 3)

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

const byUrgency = (a, b) => {
  if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1
  if (!a.dueDate) return b.dueDate ? 1 : 0
  if (!b.dueDate) return -1
  return a.dueDate.localeCompare(b.dueDate)
}

const greetingFor = (hour) => (hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening')

const firstName = (name) => {
  const first = (name ?? '').trim().split(/\s+/)[0]
  return first ? first[0].toUpperCase() + first.slice(1) : 'there'
}

const summaryOf = ({ overdue, dueToday, pending }) => {
  if (overdue && dueToday) {
    return `${plural(overdue, 'task')} overdue and ${dueToday} due today. Start with the overdue ${overdue === 1 ? 'one' : 'ones'}.`
  }
  if (overdue) {
    return `${plural(overdue, 'task')} ${overdue === 1 ? 'is' : 'are'} past the due date. Clear ${overdue === 1 ? 'it' : 'them'} first.`
  }
  if (dueToday) return `Nothing overdue. ${plural(dueToday, 'task')} due today.`
  if (pending) return `Nothing due today. ${plural(pending, 'task')} waiting in your queue.`
  return 'You are all caught up. New assignments will show up here.'
}

const urgencyOf = (task, today) =>
  !task.dueDate ? 'gray' : task.isOverdue ? 'rose' : task.dueDate === today ? 'amber' : 'blue'

const dueTextOf = (task) => {
  const diff = daysUntil(task.dueDate)
  if (diff === null) return 'No due date'
  if (diff < 0) return `${plural(Math.abs(diff), 'day')} late`
  if (diff === 0) return 'Due today'
  if (diff === 1) return 'Tomorrow'
  return `In ${diff} days`
}

const weekAround = (date) => {
  const start = new Date(date)
  start.setHours(12, 0, 0, 0)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return day
  })
}

const summarise = (data, userId, today, period) => {
  const columns = data?.columns ?? []
  const tasks = columns.flatMap((column) => column.tasks).filter((task) => task.assigneeIds.includes(userId))
  const pending = tasks.filter((task) => task.statusKind !== 'completed').sort(byUrgency)
  const completed = tasks
    .filter((task) => task.statusKind === 'completed')
    .map((task) => ({ ...task, doneOn: task.completedAt ?? task.dueDate ?? task.createdAt }))
    .filter((task) => task.doneOn && task.doneOn >= period.from && task.doneOn <= period.to)
    .sort((a, b) => b.doneOn.localeCompare(a.doneOn))
  const dueInPeriod = pending.filter(
    (task) => task.dueDate && task.dueDate >= period.from && task.dueDate <= period.to,
  )

  const statusSegments = columns
    .map((column) => ({
      id: column.id,
      name: column.name,
      tone: column.tone,
      count: tasks.filter((task) => task.statusId === column.id).length,
    }))
    .filter((segment) => segment.count > 0)

  return {
    total: tasks.length,
    pending,
    overdue: pending.filter((task) => task.isOverdue),
    dueToday: pending.filter((task) => task.dueDate === today),
    correction: pending.filter((task) => task.statusKind === 'correction'),
    upcoming: pending.filter((task) => !task.isOverdue && task.dueDate !== today),
    later: pending.filter((task) => !task.isOverdue && task.dueDate && task.dueDate !== today),
    noDate: pending.filter((task) => !task.dueDate),
    completed,
    earned: completed.reduce((sum, task) => sum + task.points, 0),
    stillDue: dueInPeriod.reduce((sum, task) => sum + task.points, 0),
    statusSegments,
  }
}

const PointsRing = ({ earned, planned, size = 96 }) => {
  const stroke = 8
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const share = planned > 0 ? Math.min(1, earned / planned) : earned > 0 ? 1 : 0
  const center = size / 2

  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.22)"
          strokeWidth={stroke}
        />
        {share > 0 ? (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - share)}
            transform={`rotate(-90 ${center} ${center})`}
            style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.2, 0.8, 0.2, 1)' }}
          />
        ) : null}
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeContent: 'center', textAlign: 'center' }}>
        <Typography
          component="span"
          sx={{
            fontSize: '1.5rem',
            fontWeight: 700,
            lineHeight: 1,
            color: '#FFFFFF',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {earned}
        </Typography>
        <Typography
          component="span"
          sx={{ mt: 0.25, fontSize: '0.6875rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)' }}
        >
          pts
        </Typography>
      </Box>
    </Box>
  )
}

const HeroBanner = ({
  greeting,
  dateLine,
  summary,
  overdue,
  earned,
  planned,
  completedCount,
  periodName,
  onReviewOverdue,
}) => {
  const note =
    planned > earned
      ? `${planned - earned} pts still due in ${periodName}`
      : earned > 0
        ? 'Everything due so far is done'
        : 'Finish tasks to earn points'

  return (
    <Box
      component="section"
      aria-label="Today at a glance"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto' },
        gap: { xs: 2, md: 3 },
        alignItems: 'center',
        px: { xs: 2, md: 3 },
        py: { xs: 2, md: 2.5 },
        borderRadius: 3,
        color: '#FFFFFF',
        background: 'linear-gradient(120deg, #1E3A8A 0%, #1D4ED8 42%, #2563EB 72%, #3B82F6 100%)',
        boxShadow: '0 16px 32px -20px rgba(29, 78, 216, 0.8)',
        '&::before': {
          content: '""',
          position: 'absolute',
          zIndex: 0,
          top: -150,
          right: { xs: -140, md: 140 },
          width: 300,
          height: 300,
          borderRadius: '50%',
          bgcolor: 'rgba(255, 255, 255, 0.07)',
          pointerEvents: 'none',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          zIndex: 0,
          bottom: -120,
          left: -70,
          width: 200,
          height: 200,
          borderRadius: '50%',
          bgcolor: 'rgba(255, 255, 255, 0.06)',
          pointerEvents: 'none',
        },
      }}
    >
      <Box sx={{ position: 'relative', zIndex: 1, minWidth: 0 }}>
        <Typography component="p" sx={{ ...overline, color: 'rgba(255, 255, 255, 0.78)' }}>
          {dateLine}
        </Typography>
        <Typography
          component="h1"
          sx={{
            mt: 0.75,
            fontSize: { xs: '1.25rem', md: '1.5rem' },
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}
        >
          {greeting}
        </Typography>
        <Typography
          component="p"
          sx={{ mt: 0.75, maxWidth: 560, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.88)' }}
        >
          {summary}
        </Typography>
        <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 2, flexWrap: 'wrap' }}>
          <Button
            component={Link}
            to={workspaceViewPath('board')}
            variant="contained"
            size="small"
            endIcon={<ArrowRight size={14} strokeWidth={2} />}
            sx={{
              bgcolor: '#FFFFFF',
              color: colors.brandDark,
              fontWeight: 600,
              boxShadow: '0 6px 14px -6px rgba(15, 23, 42, 0.45)',
              '&:hover': { bgcolor: colors.brandSoft },
            }}
          >
            Open my board
          </Button>
          {overdue > 0 ? (
            <Button
              size="small"
              variant="outlined"
              onClick={onReviewOverdue}
              startIcon={<TriangleAlert size={14} strokeWidth={2} />}
              sx={{
                color: '#FFFFFF',
                borderColor: 'rgba(255, 255, 255, 0.45)',
                '&:hover': { borderColor: '#FFFFFF', bgcolor: 'rgba(255, 255, 255, 0.1)' },
              }}
            >
              Review overdue
            </Button>
          ) : null}
        </Stack>
      </Box>

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          minWidth: { md: 300 },
          p: { xs: 1.5, md: 1.75 },
          pr: { md: 2.5 },
          borderRadius: 2.5,
          bgcolor: 'rgba(255, 255, 255, 0.12)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(4px)',
        }}
      >
        <PointsRing earned={earned} planned={planned} />
        <Box sx={{ minWidth: 0 }}>
          <Typography component="p" sx={{ ...overline, color: 'rgba(255, 255, 255, 0.78)' }}>
            Points · {periodName}
          </Typography>
          <Typography
            component="p"
            sx={{ mt: 0.25, fontSize: '1.125rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
          >
            {earned}{' '}
            <Box component="span" sx={{ fontSize: '0.8125rem', fontWeight: 500, opacity: 0.82 }}>
              {planned > earned ? `of ${planned} pts` : 'pts earned'}
            </Box>
          </Typography>
          <Typography component="p" sx={{ mt: 0.5, fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.82)' }}>
            {note}
          </Typography>
          <Typography component="p" sx={{ mt: 0.25, fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.82)' }}>
            {plural(completedCount, 'task')} completed
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

const TileButton = ({ selected, pressed, tone, onClick, children }) => {
  const palette = STATUS_TONES[tone] ?? STATUS_TONES.blue
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      sx={{
        display: 'block',
        width: '100%',
        height: '100%',
        p: 0,
        m: 0,
        border: 0,
        bgcolor: 'transparent',
        font: 'inherit',
        textAlign: 'left',
        cursor: 'pointer',
        borderRadius: 2.5,
        outline: `2px solid ${selected ? palette.strong : 'transparent'}`,
        outlineOffset: 2,
        transition: 'outline-color 140ms ease',
        '&:focus-visible': { outlineColor: colors.brand },
      }}
    >
      {children}
    </Box>
  )
}

const FilterChip = ({ label, count, tone = 'slate', selected, onClick }) => {
  const palette = STATUS_TONES[tone] ?? STATUS_TONES.slate
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      sx={{
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        height: 30,
        pl: 1.25,
        pr: 0.75,
        border: `1px solid ${selected ? colors.brand : colors.border}`,
        borderRadius: 999,
        bgcolor: selected ? colors.brand : colors.surface,
        color: selected ? '#FFFFFF' : colors.textPrimary,
        boxShadow: selected ? '0 4px 10px -4px rgba(37, 99, 235, 0.55)' : 'none',
        font: 'inherit',
        fontSize: '0.75rem',
        fontWeight: selected ? 650 : 500,
        cursor: 'pointer',
        transition: 'background-color 140ms ease, border-color 140ms ease, color 140ms ease',
        '&:hover': { borderColor: colors.brand, bgcolor: selected ? colors.brandDark : colors.brandSoft },
        '&:focus-visible': focusRing,
      }}
    >
      {label}
      <Box
        component="span"
        sx={{
          minWidth: 20,
          height: 20,
          px: 0.5,
          borderRadius: 999,
          display: 'grid',
          placeItems: 'center',
          fontSize: '0.6875rem',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          bgcolor: selected ? 'rgba(255, 255, 255, 0.22)' : count > 0 ? palette.soft : colors.neutralSoft,
          color: selected ? '#FFFFFF' : count > 0 ? palette.strong : colors.textSecondary,
        }}
      >
        {count}
      </Box>
    </Box>
  )
}

const DateBlock = ({ task, tone }) => {
  const date = parseIsoDate(task.dueDate)
  return (
    <Box
      aria-hidden="true"
      sx={{
        width: 42,
        height: 44,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 2,
        bgcolor: tone.soft,
        border: `1px solid ${tone.border}`,
        color: tone.strong,
      }}
    >
      <Box
        component="span"
        sx={{
          fontSize: '0.5625rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          lineHeight: 1.3,
        }}
      >
        {date ? shortMonth(date) : 'No'}
      </Box>
      <Box
        component="span"
        sx={{
          fontSize: date ? '1rem' : '0.6875rem',
          fontWeight: 700,
          lineHeight: 1.1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {date ? date.getDate() : 'date'}
      </Box>
    </Box>
  )
}

const DuePill = ({ task, tone, today }) => {
  const urgent = task.isOverdue || task.dueDate === today
  return (
    <Tooltip title={task.dueDate ? `Due ${formatDate(task.dueDate)}` : 'No due date set'}>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          height: 24,
          px: urgent ? 0.875 : 0,
          borderRadius: 999,
          bgcolor: urgent ? tone.soft : 'transparent',
          border: urgent ? `1px solid ${tone.border}` : 0,
          color: urgent ? tone.strong : colors.textSecondary,
          fontSize: '0.75rem',
          fontWeight: urgent ? 700 : 500,
          whiteSpace: 'nowrap',
        }}
      >
        {task.isOverdue ? <TriangleAlert size={12} strokeWidth={2.25} aria-hidden="true" /> : null}
        {!task.isOverdue && urgent ? <Clock3 size={12} strokeWidth={2.25} aria-hidden="true" /> : null}
        {dueTextOf(task)}
      </Box>
    </Tooltip>
  )
}

const TaskRow = ({ task, today, onOpen }) => {
  const tone = STATUS_TONES[urgencyOf(task, today)]
  const priorityTone = STATUS_TONES[PRIORITY_TONES[task.priority] ?? 'gray']
  const place = [task.groupName, task.teamName].filter((name) => name && name !== '—').join(' · ')

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => onOpen(task)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(task)
        }
      }}
      aria-label={`Open task ${task.title}, ${dueTextOf(task)}`}
      sx={{
        display: 'grid',
        gridTemplateColumns: 'auto minmax(0, 1fr) auto',
        gap: { xs: 1.25, sm: 1.5 },
        alignItems: 'center',
        px: 1.75,
        py: 1.125,
        cursor: 'pointer',
        borderBottom: `1px solid ${colors.border}`,
        transition: 'background-color 120ms ease',
        '&:last-child': { borderBottom: 0 },
        '&:hover': { bgcolor: colors.page },
        '&:hover .row-arrow': { opacity: 1, transform: 'none' },
        '&:focus-visible': { outline: 'none', boxShadow: `inset 0 0 0 2px ${colors.brand}` },
      }}
    >
      <DateBlock task={task} tone={tone} />

      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
          {task.title}
        </Typography>
        <Stack direction="row" spacing={0.75} useFlexGap sx={{ mt: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <StatusChip label={task.statusName} tone={task.statusTone} size="small" />
          {task.clientName ? <ToneChip label={task.clientName} tone={task.clientTone} /> : null}
          {task.points ? <ToneChip label={`${task.points} pts`} tone="blue" /> : null}
          <Tooltip title={`${task.priority} priority`}>
            <Box sx={{ display: 'inline-flex', color: priorityTone.strong }}>
              <Flag size={13} strokeWidth={2} aria-label={`${task.priority} priority`} />
            </Box>
          </Tooltip>
          {place ? (
            <Typography
              variant="caption"
              noWrap
              sx={{ display: { xs: 'none', md: 'block' }, minWidth: 0, color: colors.textSecondary }}
            >
              {place}
            </Typography>
          ) : null}
        </Stack>
      </Box>

      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <DuePill task={task} tone={tone} today={today} />
        <Box
          className="row-arrow"
          sx={{
            display: { xs: 'none', sm: 'inline-flex' },
            color: colors.textSecondary,
            opacity: 0,
            transform: 'translateX(-4px)',
            transition: 'opacity 140ms ease, transform 140ms ease',
          }}
        >
          <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
        </Box>
      </Stack>
    </Box>
  )
}

const SectionLabel = ({ label, count, tone }) => {
  const palette = STATUS_TONES[tone] ?? STATUS_TONES.slate
  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.75,
        py: 0.625,
        bgcolor: colors.page,
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <Box aria-hidden="true" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: palette.strong }} />
      <Typography component="span" sx={{ ...overline, letterSpacing: '0.07em', color: palette.strong }}>
        {label}
      </Typography>
      <Typography component="span" sx={{ fontSize: '0.6875rem', fontWeight: 600, color: colors.textSecondary }}>
        {count}
      </Typography>
    </Box>
  )
}

const WeekDay = ({ day, selected, onClick }) => {
  const tone =
    day.count === 0 ? null : day.isPast ? STATUS_TONES.rose : day.isToday ? STATUS_TONES.amber : STATUS_TONES.blue
  return (
    <Box
      component="button"
      type="button"
      disabled={day.count === 0}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${day.long}: ${plural(day.count, 'task')} due`}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        minWidth: 0,
        py: 0.875,
        px: 0,
        border: `1px solid ${selected ? colors.brand : day.isToday ? '#BFD3F8' : 'transparent'}`,
        borderRadius: 2,
        bgcolor: selected ? colors.brand : day.isToday ? colors.brandSoft : 'transparent',
        boxShadow: selected ? '0 4px 10px -4px rgba(37, 99, 235, 0.55)' : 'none',
        color: colors.textPrimary,
        font: 'inherit',
        cursor: day.count ? 'pointer' : 'default',
        transition: 'background-color 140ms ease, border-color 140ms ease',
        '&:hover:not(:disabled)': { bgcolor: selected ? colors.brandDark : colors.brandSoft },
        '&:focus-visible': focusRing,
      }}
    >
      <Box
        component="span"
        sx={{
          fontSize: '0.625rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: selected ? 'rgba(255, 255, 255, 0.85)' : day.isToday ? colors.brand : colors.textSecondary,
        }}
      >
        {day.weekday}
      </Box>
      <Box
        component="span"
        sx={{
          fontSize: '0.9375rem',
          fontWeight: 700,
          lineHeight: 1.1,
          fontVariantNumeric: 'tabular-nums',
          color: selected
            ? '#FFFFFF'
            : day.isToday
              ? colors.brand
              : day.isPast
                ? colors.textSecondary
                : colors.textPrimary,
        }}
      >
        {day.date}
      </Box>
      <Box
        component="span"
        sx={{
          minWidth: 18,
          height: 18,
          px: 0.5,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 999,
          fontSize: '0.625rem',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          bgcolor: tone ? (selected ? '#FFFFFF' : tone.soft) : 'transparent',
          color: tone ? tone.strong : '#CBD5E1',
        }}
      >
        {day.count || '·'}
      </Box>
    </Box>
  )
}

export const EmployeeDashboard = () => {
  const { user } = useSession()
  const { activeWorkspace, activeWorkspaceId } = useWorkspace()
  const { yearRange, yearLabel, isCurrentYear } = usePeriod()
  const board = useAsync(taskService.getBoard, [activeWorkspaceId, yearRange], { enabled: Boolean(activeWorkspaceId) })

  const [filter, setFilter] = useState('all')
  const [selectedTask, setSelectedTask] = useState(null)
  const [editingTask, setEditingTask] = useState(null)
  const listRef = useRef(null)

  const now = new Date()
  const today = localDay(now)
  const period = isCurrentYear ? monthRange(now) : yearRange
  const periodName = isCurrentYear ? MONTH_NAMES[now.getMonth()] : `FY ${yearLabel}`

  const mine = summarise(board.data, user?.id, today, period)

  const weekDates = weekAround(now)
  const week = weekDates.map((date) => {
    const key = localDay(date)
    return {
      key,
      weekday: WEEKDAYS[(date.getDay() + 6) % 7],
      date: date.getDate(),
      long: formatLongDate(key),
      isToday: key === today,
      isPast: key < today,
      count: mine.pending.filter((task) => task.dueDate === key).length,
    }
  })
  const weekLabel = `${week[0].date} ${shortMonth(weekDates[0])} – ${week[6].date} ${shortMonth(weekDates[6])}`

  const filters = [
    { key: 'all', label: 'All pending', items: mine.pending, tone: 'blue' },
    { key: 'overdue', label: 'Overdue', items: mine.overdue, tone: 'rose' },
    { key: 'today', label: 'Due today', items: mine.dueToday, tone: 'amber' },
    { key: 'correction', label: 'In correction', items: mine.correction, tone: 'orange' },
    { key: 'upcoming', label: 'Upcoming', items: mine.upcoming, tone: 'slate' },
  ]
  const dayFilter = filter.startsWith('day:') ? filter.slice(4) : null
  const visible = dayFilter
    ? mine.pending.filter((task) => task.dueDate === dayFilter)
    : (filters.find((item) => item.key === filter) ?? filters[0]).items

  const sections = [
    { key: 'overdue', label: 'Overdue', tone: 'rose', items: mine.overdue },
    { key: 'today', label: 'Due today', tone: 'amber', items: mine.dueToday },
    { key: 'later', label: 'Coming up', tone: 'blue', items: mine.later },
    { key: 'none', label: 'No due date', tone: 'gray', items: mine.noDate },
  ].filter((section) => section.items.length > 0)

  const focusList = (key) => {
    setFilter(key)
    const node = listRef.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    if (rect.top < 72 || rect.top > window.innerHeight - 160)
      node.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const refresh = () => {
    board.reload()
    if (selectedTask) {
      taskService
        .getTask(selectedTask.id)
        .then(setSelectedTask)
        .catch(() => setSelectedTask(null))
    }
  }

  const loading = board.loading && !board.data
  const planned = mine.earned + mine.stillDue
  const listDescription = dayFilter
    ? `Due ${formatLongDate(dayFilter)}`
    : filter === 'all'
      ? 'Overdue first, then by due date'
      : `${(filters.find((item) => item.key === filter) ?? filters[0]).label} only`

  const tiles = [
    {
      key: 'all',
      label: 'Pending',
      value: mine.pending.length,
      helper: 'assigned to you, not done',
      icon: ClipboardList,
      tone: 'blue',
    },
    {
      key: 'today',
      label: 'Due today',
      value: mine.dueToday.length,
      helper: mine.dueToday.length ? 'finish these first' : 'nothing due today',
      icon: Clock3,
      tone: 'amber',
      emphasis: mine.dueToday.length > 0,
    },
    {
      key: 'overdue',
      label: 'Overdue',
      value: mine.overdue.length,
      helper: mine.overdue.length ? 'past their due date' : 'all on track',
      icon: mine.overdue.length ? TriangleAlert : CircleCheck,
      tone: mine.overdue.length ? 'rose' : 'teal',
      emphasis: mine.overdue.length > 0,
    },
    {
      key: 'correction',
      label: 'Needs correction',
      value: mine.correction.length,
      helper: mine.correction.length ? 'sent back for changes' : 'nothing sent back',
      icon: RotateCcw,
      tone: 'orange',
      emphasis: mine.correction.length > 0,
    },
  ]

  return (
    <Box>
      <QueryStateView error={board.error} onRetry={board.reload}>
        {loading ? (
          <Stack spacing={GAP}>
            <Skeleton variant="rounded" height={156} sx={{ borderRadius: 3 }} />
            <Box
              sx={{ display: 'grid', gap: GAP, gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' } }}
            >
              {[0, 1, 2, 3].map((index) => (
                <StatTileSkeleton key={index} />
              ))}
            </Box>
            <Box
              sx={{
                display: 'grid',
                gap: GAP,
                gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.75fr) minmax(320px, 1fr)' },
                alignItems: 'start',
              }}
            >
              <ListSectionSkeleton rows={5} wide />
              <ListSectionSkeleton rows={4} />
            </Box>
          </Stack>
        ) : (
          <Stack spacing={GAP}>
            <HeroBanner
              greeting={`${greetingFor(now.getHours())}, ${firstName(user?.name)}`}
              dateLine={`${formatLongDate(today)}${activeWorkspace ? ` · ${activeWorkspace.name}` : ''}`}
              summary={summaryOf({
                overdue: mine.overdue.length,
                dueToday: mine.dueToday.length,
                pending: mine.pending.length,
              })}
              overdue={mine.overdue.length}
              earned={mine.earned}
              planned={planned}
              completedCount={mine.completed.length}
              periodName={periodName}
              onReviewOverdue={() => focusList('overdue')}
            />

            <Box
              sx={{ display: 'grid', gap: GAP, gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' } }}
            >
              {tiles.map((tile) => (
                <TileButton
                  key={tile.key}
                  tone={tile.tone}
                  pressed={filter === tile.key}
                  selected={filter === tile.key && tile.key !== 'all'}
                  onClick={() => focusList(filter === tile.key ? 'all' : tile.key)}
                >
                  <StatCard
                    label={tile.label}
                    value={tile.value}
                    helperText={tile.helper}
                    icon={tile.icon}
                    tone={tile.tone}
                    emphasis={tile.emphasis}
                  />
                </TileButton>
              ))}
            </Box>

            <Box
              sx={{
                display: 'grid',
                gap: GAP,
                gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.75fr) minmax(320px, 1fr)' },
                alignItems: 'start',
              }}
            >
              <Box ref={listRef} sx={{ scrollMarginTop: 80, minWidth: 0 }}>
                <SectionCard
                  title="My tasks"
                  description={listDescription}
                  accent="blue"
                  padded={false}
                  action={
                    <Button
                      component={Link}
                      to={workspaceViewPath('board')}
                      size="small"
                      variant="text"
                      endIcon={<ChevronRight size={14} strokeWidth={2} />}
                    >
                      View board
                    </Button>
                  }
                >
                  <Stack
                    direction="row"
                    spacing={0.75}
                    sx={{
                      alignItems: 'center',
                      px: 1.75,
                      py: 1.25,
                      overflowX: 'auto',
                      borderBottom: `1px solid ${colors.border}`,
                      scrollbarWidth: 'thin',
                    }}
                  >
                    {filters.map((item) => (
                      <FilterChip
                        key={item.key}
                        label={item.label}
                        count={item.items.length}
                        tone={item.tone}
                        selected={filter === item.key}
                        onClick={() => setFilter(item.key)}
                      />
                    ))}
                    {dayFilter ? (
                      <Box
                        component="button"
                        type="button"
                        onClick={() => setFilter('all')}
                        aria-label="Clear day filter"
                        sx={{
                          flexShrink: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          height: 30,
                          px: 1.25,
                          border: `1px solid ${colors.brand}`,
                          borderRadius: 999,
                          bgcolor: colors.brand,
                          color: '#FFFFFF',
                          font: 'inherit',
                          fontSize: '0.75rem',
                          fontWeight: 650,
                          cursor: 'pointer',
                          '&:hover': { bgcolor: colors.brandDark },
                          '&:focus-visible': focusRing,
                        }}
                      >
                        {formatDate(dayFilter)}
                        <X size={13} strokeWidth={2.25} aria-hidden="true" />
                      </Box>
                    ) : null}
                  </Stack>

                  {visible.length === 0 ? (
                    <EmptyState
                      icon={CircleCheck}
                      title={mine.pending.length === 0 ? 'Nothing pending' : 'Nothing in this list'}
                      description={
                        mine.pending.length === 0
                          ? 'You are all caught up. New assignments will show up here.'
                          : 'Pick another filter to see the rest of your work.'
                      }
                    />
                  ) : (
                    <Box sx={{ maxHeight: { lg: 560 }, overflowY: { lg: 'auto' } }}>
                      {filter === 'all'
                        ? sections.map((section) => (
                            <Box
                              key={section.key}
                              sx={{ '&:not(:last-child)': { borderBottom: `1px solid ${colors.border}` } }}
                            >
                              <SectionLabel label={section.label} count={section.items.length} tone={section.tone} />
                              {section.items.map((task) => (
                                <TaskRow key={task.id} task={task} today={today} onOpen={setSelectedTask} />
                              ))}
                            </Box>
                          ))
                        : visible.map((task) => (
                            <TaskRow key={task.id} task={task} today={today} onOpen={setSelectedTask} />
                          ))}
                    </Box>
                  )}
                </SectionCard>
              </Box>

              <Stack spacing={GAP} sx={{ minWidth: 0 }}>
                <SectionCard title="This week" description={`${weekLabel} · tasks due each day`} accent="amber">
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0.5 }}>
                    {week.map((day) => (
                      <WeekDay
                        key={day.key}
                        day={day}
                        selected={dayFilter === day.key}
                        onClick={() => focusList(dayFilter === day.key ? 'all' : `day:${day.key}`)}
                      />
                    ))}
                  </Box>
                </SectionCard>

                <SectionCard
                  title="My tasks by status"
                  description={`${plural(mine.total, 'task')} · FY ${yearLabel}`}
                  accent="violet"
                >
                  {mine.statusSegments.length === 0 ? (
                    <Typography variant="caption" component="p">
                      No tasks assigned yet.
                    </Typography>
                  ) : (
                    <>
                      <StatusSplitBar
                        segments={mine.statusSegments}
                        height={8}
                        legend={false}
                        ariaLabel="My tasks by status"
                      />
                      <Stack spacing={1} sx={{ mt: 1.5 }}>
                        {mine.statusSegments.map((segment) => {
                          const tone = STATUS_TONES[segment.tone] ?? STATUS_TONES.slate
                          return (
                            <Stack key={segment.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                              <Box
                                aria-hidden="true"
                                sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: tone.strong, flexShrink: 0 }}
                              />
                              <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
                                {segment.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: colors.textSecondary, fontVariantNumeric: 'tabular-nums' }}
                              >
                                {Math.round((segment.count / mine.total) * 100)}%
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  width: 28,
                                  textAlign: 'right',
                                  fontWeight: 700,
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {segment.count}
                              </Typography>
                            </Stack>
                          )
                        })}
                      </Stack>
                    </>
                  )}
                </SectionCard>

                <SectionCard
                  title={`Completed in ${periodName}`}
                  description={`${plural(mine.completed.length, 'task')} · ${mine.earned} pts earned`}
                  accent="green"
                  padded={false}
                  action={mine.earned > 0 ? <ToneChip label={`+${mine.earned} pts`} tone="green" /> : null}
                >
                  {mine.completed.length === 0 ? (
                    <Stack spacing={0.5} sx={{ alignItems: 'center', textAlign: 'center', px: 2, py: 3 }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          display: 'grid',
                          placeItems: 'center',
                          borderRadius: '50%',
                          bgcolor: STATUS_TONES.green.soft,
                          color: STATUS_TONES.green.strong,
                          mb: 0.5,
                        }}
                      >
                        <CircleCheck size={18} strokeWidth={2} aria-hidden="true" />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Nothing completed yet
                      </Typography>
                      <Typography variant="caption" component="p" sx={{ maxWidth: 260 }}>
                        Finished tasks and the points they earn show up here.
                      </Typography>
                    </Stack>
                  ) : (
                    <>
                      {mine.completed.slice(0, 6).map((task) => (
                        <Stack
                          key={task.id}
                          direction="row"
                          spacing={1.25}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedTask(task)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              setSelectedTask(task)
                            }
                          }}
                          aria-label={`Open completed task ${task.title}`}
                          sx={{
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
                          <Box
                            aria-hidden="true"
                            sx={{
                              width: 28,
                              height: 28,
                              flexShrink: 0,
                              display: 'grid',
                              placeItems: 'center',
                              borderRadius: '50%',
                              bgcolor: STATUS_TONES.green.soft,
                              color: STATUS_TONES.green.strong,
                            }}
                          >
                            <Check size={14} strokeWidth={2.5} />
                          </Box>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                              {task.title}
                            </Typography>
                            <Typography variant="caption" component="p" noWrap>
                              {[task.clientName, formatDate(task.doneOn)].filter(Boolean).join(' · ')}
                            </Typography>
                          </Box>
                          {task.points ? (
                            <Typography
                              component="span"
                              sx={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: STATUS_TONES.green.strong,
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              +{task.points}
                            </Typography>
                          ) : null}
                        </Stack>
                      ))}
                      {mine.completed.length > 6 ? (
                        <Typography
                          variant="caption"
                          component="p"
                          sx={{ px: 1.75, py: 1, borderTop: `1px solid ${colors.border}`, color: colors.textSecondary }}
                        >
                          +{mine.completed.length - 6} more in {periodName}
                        </Typography>
                      ) : null}
                    </>
                  )}
                </SectionCard>
              </Stack>
            </Box>
          </Stack>
        )}
      </QueryStateView>

      {selectedTask ? (
        <TaskDetailDrawer
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onChanged={refresh}
          onEdit={(task) => {
            setSelectedTask(null)
            setEditingTask(task)
          }}
        />
      ) : null}

      {editingTask ? (
        <TaskFormDialog open task={editingTask} onClose={() => setEditingTask(null)} onSaved={refresh} />
      ) : null}
    </Box>
  )
}
