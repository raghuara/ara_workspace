import { colors } from '@/theme/tokens'

export const overline = {
  fontSize: '0.625rem',
  fontWeight: 700,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  color: colors.textSecondary,
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const LONG_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export const MAX_RANGE_DAYS = 93

export const PERIOD_MODES = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'custom', label: 'Custom' },
]

export const SECTIONS = {
  assigned: { label: 'Assigned', tone: 'blue' },
  outcome: { label: 'Outcome', tone: 'green' },
  desk: { label: 'Clients & desk', tone: 'teal' },
}

export const METRICS = [
  {
    key: 'assigned',
    label: 'New assigned',
    short: 'New',
    tone: 'blue',
    section: 'assigned',
    kind: 'tasks',
    isDefault: true,
    help: 'Tasks that landed on the person: created that day, or scheduled for that day.',
  },
  {
    key: 'corrections',
    label: 'Corrections',
    short: 'Corr',
    tone: 'rose',
    section: 'assigned',
    kind: 'tasks',
    isDefault: true,
    help: 'Each time one of their tasks was moved into a Correction column.',
  },
  {
    key: 'total',
    label: 'Total assigned',
    short: 'Total',
    tone: 'slate',
    section: 'assigned',
    kind: 'total',
    strong: true,
    isDefault: true,
    help: 'New assigned + corrections.',
  },
  {
    key: 'completed',
    label: 'Completed',
    short: 'Done',
    tone: 'green',
    section: 'outcome',
    kind: 'tasks',
    isDefault: true,
    help: 'Their tasks marked complete — including ones assigned earlier.',
  },
  {
    key: 'inReview',
    label: 'In review (EOD)',
    short: 'Review',
    tone: 'violet',
    section: 'outcome',
    kind: 'tasks',
    isDefault: true,
    help: 'Open tasks sitting in a Review column at the end of the last day shown.',
  },
  {
    key: 'inProgress',
    label: 'In progress (EOD)',
    short: 'Open',
    tone: 'amber',
    section: 'outcome',
    kind: 'tasks',
    shaded: true,
    isDefault: true,
    help: 'Everything still open on their plate at the end of the last day shown — review and carried-over work included.',
  },
  {
    key: 'overdue',
    label: 'Overdue (EOD)',
    short: 'Late',
    tone: 'rose',
    section: 'outcome',
    kind: 'tasks',
    shaded: true,
    isDefault: true,
    help: 'Open tasks whose due date had already passed at the end of the last day shown.',
  },
  {
    key: 'completion',
    label: 'Daily completion %',
    short: 'Done %',
    section: 'outcome',
    kind: 'percent',
    isDefault: true,
    help: 'Completed ÷ total assigned. Green at 100%, amber from 80%, red below that.',
  },
  {
    key: 'clients',
    label: 'Handling clients',
    short: 'Clients',
    tone: 'teal',
    section: 'desk',
    kind: 'clients',
    isDefault: false,
    help: 'Active clients the person is assigned to handle (Clients › coverage) as of the last day shown.',
  },
  {
    key: 'complaints',
    label: 'Feedback',
    short: 'Fdbk',
    tone: 'orange',
    section: 'desk',
    kind: 'tickets',
    requires: 'tickets',
    isDefault: false,
    help: 'Client Desk feedback raised in the period that the person owns.',
  },
  {
    key: 'requirementsDone',
    label: 'Requirements completed',
    short: 'Req done',
    tone: 'green',
    section: 'desk',
    kind: 'tickets',
    requires: 'tickets',
    isDefault: false,
    help: 'Client Desk requirements the person owns that were marked Completed in the period.',
  },
]

export const METRIC_KEYS = METRICS.map((metric) => metric.key)
export const DEFAULT_METRICS = METRICS.filter((metric) => metric.isDefault).map((metric) => metric.key)

const FLOW_LISTS = ['assigned', 'corrections', 'completed', 'complaints', 'requirementsDone']
const SNAPSHOT_LISTS = ['inProgress', 'inReview', 'overdue']
const ACTIVITY_LISTS = ['assigned', 'corrections', 'completed']

export const isAvailable = (metric, capabilities = {}) => !metric.requires || Boolean(capabilities[metric.requires])

export const visibleMetrics = (selected, capabilities) =>
  METRICS.filter((metric) => selected.includes(metric.key) && isAvailable(metric, capabilities))

const pad = (value) => String(value).padStart(2, '0')

const parse = (key) => new Date(`${key}T00:00:00`)

export const localDay = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const shiftDay = (key, by) => {
  const date = parse(key)
  date.setDate(date.getDate() + by)
  return localDay(date)
}

export const isValidDay = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') && !Number.isNaN(parse(value).getTime())

export const spanInDays = (from, to) => Math.round((parse(to) - parse(from)) / 86400000) + 1

export const describeDay = (key) => {
  const date = parse(key)
  return {
    dayOfMonth: date.getDate(),
    weekday: WEEKDAYS[date.getDay()],
    weekdayShort: WEEKDAYS[date.getDay()].slice(0, 3),
    monthYear: `${MONTHS[date.getMonth()]} ${date.getFullYear()}`,
    short: `${pad(date.getDate())}-${MONTHS[date.getMonth()]}-${date.getFullYear()}`,
    medium: `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`,
    weekend: date.getDay() === 0 || date.getDay() === 6,
  }
}

export const formatShortDate = (key) => {
  if (!key) return ''
  const date = parse(key)
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`
}

const startOfWeek = (key) => {
  const date = parse(key)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return localDay(date)
}

export const periodFor = (mode, anchor, custom = {}) => {
  if (mode === 'week') {
    const from = startOfWeek(anchor)
    return { from, to: shiftDay(from, 6) }
  }
  if (mode === 'month') {
    const date = parse(anchor)
    return {
      from: localDay(new Date(date.getFullYear(), date.getMonth(), 1)),
      to: localDay(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
    }
  }
  if (mode === 'custom' && isValidDay(custom.from) && isValidDay(custom.to) && custom.from <= custom.to) {
    return { from: custom.from, to: custom.to }
  }
  return { from: anchor, to: anchor }
}

export const shiftAnchor = (mode, anchor, by) => {
  if (mode === 'week') return shiftDay(anchor, by * 7)
  if (mode === 'month') {
    const date = parse(anchor)
    return localDay(new Date(date.getFullYear(), date.getMonth() + by, 1))
  }
  return shiftDay(anchor, by)
}

export const periodLabel = (mode, { from, to }) => {
  if (mode === 'day' || from === to) {
    const day = describeDay(from)
    return `${day.weekday}, ${day.medium}`
  }
  if (mode === 'month') {
    const date = parse(from)
    return `${LONG_MONTHS[date.getMonth()]} ${date.getFullYear()}`
  }
  const start = describeDay(from)
  const end = describeDay(to)
  return `${start.dayOfMonth} ${start.monthYear.split(' ')[0]} – ${end.medium}`
}

export const clampToToday = (period, today = localDay()) => ({
  from: period.from,
  to: period.to > today ? today : period.to,
})

export const completionTone = (percent) =>
  percent === null ? 'slate' : percent >= 100 ? 'green' : percent >= 80 ? 'amber' : 'rose'

export const formatPercent = (percent) => (percent === null ? '—' : `${percent.toFixed(1)}%`)

export const rateOf = (completed, total) => (total ? Math.round((completed / total) * 1000) / 10 : null)

export const isIdle = (row) => [...ACTIVITY_LISTS, ...SNAPSHOT_LISTS].every((key) => row[key] === 0)

const emptyLists = () => ({
  ...Object.fromEntries([...FLOW_LISTS, ...SNAPSHOT_LISTS].map((key) => [key, []])),
  clients: [],
})

const finish = (base, lists) => {
  const all = { ...lists, total: [...lists.assigned, ...lists.corrections] }
  const counts = Object.fromEntries(Object.entries(all).map(([key, list]) => [key, list.length]))
  return { ...base, ...counts, lists: all, completionRate: rateOf(counts.completed, counts.total) }
}

export const buildLookup = (data) => ({
  tasks: new Map((data?.tasks ?? []).map((task) => [task.id, task])),
  tickets: new Map((data?.tickets ?? []).map((ticket) => [ticket.id, ticket])),
  clients: new Map((data?.clients ?? []).map((client) => [client.id, client])),
})

const clientsFor = (handling, personId, day) =>
  handling.filter((row) => row.employeeId === personId && row.since <= day)

export const buildByPerson = (people, entries, lastDay, handling = []) => {
  const lists = new Map(people.map((person) => [person.id, emptyLists()]))
  entries.forEach((entry) => {
    const target = lists.get(entry.id)
    if (!target) return
    FLOW_LISTS.forEach((key) => target[key].push(...(entry[key] ?? [])))
    if (entry.date === lastDay) SNAPSHOT_LISTS.forEach((key) => (target[key] = [...(entry[key] ?? [])]))
  })
  return people.map((person) => {
    const target = lists.get(person.id)
    target.clients = clientsFor(handling, person.id, lastDay)
    return finish(person, target)
  })
}

export const buildByDay = (people, entries, handling = []) => {
  const personById = new Map(people.map((person) => [person.id, person]))
  const order = new Map(people.map((person, index) => [person.id, index]))
  const days = new Map()

  entries.forEach((entry) => {
    const person = personById.get(entry.id)
    if (!person || ![...FLOW_LISTS].some((key) => (entry[key] ?? []).length > 0)) return
    const lists = emptyLists()
    ;[...FLOW_LISTS, ...SNAPSHOT_LISTS].forEach((key) => (lists[key] = [...(entry[key] ?? [])]))
    lists.clients = clientsFor(handling, person.id, entry.date)
    if (!days.has(entry.date)) days.set(entry.date, [])
    days.get(entry.date).push(finish(person, lists))
  })

  return [...days]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, rows]) => {
      const sorted = rows.sort((a, b) => order.get(a.id) - order.get(b.id))
      return { date, ...describeDay(date), rows: sorted, totals: sumRows(sorted) }
    })
}

export const sumRows = (rows) => {
  const keys = [...FLOW_LISTS, ...SNAPSHOT_LISTS, 'total']
  const totals = Object.fromEntries(keys.map((key) => [key, rows.reduce((sum, row) => sum + row[key], 0)]))
  const clients = new Set(rows.flatMap((row) => row.lists.clients.map((item) => item.clientId)))
  return {
    ...totals,
    clients: clients.size,
    active: rows.filter((row) => ACTIVITY_LISTS.some((key) => row[key] > 0)).length,
    people: rows.length,
    completionRate: rateOf(totals.completed, totals.total),
  }
}

export const filterPeople = (people, { groupId = 'all', teamId = 'all' } = {}) =>
  people.filter(
    (person) =>
      (groupId === 'all' || person.groupIds.includes(groupId)) && (teamId === 'all' || person.teamIds.includes(teamId)),
  )

const DETAIL_LIMIT = 5000

const safeText = (value) => {
  const text = String(value ?? '')
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
}

const clientNames = (row, lookup) =>
  row.lists.clients.map((item) => lookup.clients.get(item.clientId)?.name).filter(Boolean)

const exportValue = (metric, row) => (metric.kind === 'percent' ? row.completionRate : row[metric.key])

const exportColumns = (metrics) => [
  { label: 'Date', kind: 'text', width: 13 },
  { label: 'Day', kind: 'text', width: 7 },
  { label: 'Team member', kind: 'text', width: 22 },
  { label: 'Role', kind: 'text', width: 18 },
  { label: 'Team', kind: 'text', width: 18 },
  ...metrics.map((metric) => ({
    label: metric.label,
    kind: metric.kind === 'percent' ? 'percent' : 'count',
    width: metric.kind === 'percent' ? 14 : 12,
    section: SECTIONS[metric.section].label,
    sectionTone: SECTIONS[metric.section].tone,
    shade: metric.shaded ? metric.tone : undefined,
  })),
]

const exportRow = (dateLabel, weekday, row, metrics, lookup, group) => {
  const notes = {}
  metrics.forEach((metric, index) => {
    if (metric.kind === 'clients' && row.clients > 0) notes[5 + index] = clientNames(row, lookup).join('\n')
  })
  return {
    cells: [dateLabel, weekday, row.fullName, row.designation, row.teamName ?? '', ...metrics.map((metric) => exportValue(metric, row))],
    group,
    notes,
  }
}

const totalsRow = (label, totals, metrics) => ({
  cells: [label, '', `${totals.people} people`, `${totals.active} worked`, '', ...metrics.map((metric) => exportValue(metric, totals))],
  style: 'total',
})

const periodText = ({ from, to }) => {
  const start = describeDay(from)
  return from === to ? start.short : `${start.short} to ${describeDay(to).short}`
}

export const buildExportTable = ({ view, rows, days, totals, period, metrics, lookup }) => {
  const columns = exportColumns(metrics)
  const body =
    view === 'day'
      ? days.flatMap((day, index) => day.rows.map((row) => exportRow(day.short, day.weekdayShort, row, metrics, lookup, index)))
      : rows.map((row, index) =>
          exportRow(periodText(period), period.from === period.to ? describeDay(period.from).weekdayShort : '', row, metrics, lookup, index),
        )
  return { columns, rows: [...body, totalsRow(view === 'day' ? 'Period total' : 'Total', totals, metrics)] }
}

const detailItems = (row, metric, lookup) => {
  if (metric.kind === 'clients') {
    return row.lists.clients.map((item) => {
      const client = lookup.clients.get(item.clientId)
      return [client?.name ?? '', client?.company ?? '', item.isPrimary ? 'Primary' : 'Support', item.since ?? '']
    })
  }
  if (metric.kind === 'tickets') {
    return row.lists[metric.key].map((id) => {
      const ticket = lookup.tickets.get(id)
      return [
        ticket?.title ?? '',
        lookup.clients.get(ticket?.clientId)?.name ?? '',
        ticket?.status ?? '',
        (ticket?.kind === 'Complaint' ? ticket?.createdAt : ticket?.closedAt) ?? '',
      ]
    })
  }
  return row.lists[metric.key].map((id) => {
    const task = lookup.tasks.get(id)
    return [
      task?.title ?? '',
      lookup.clients.get(task?.clientId)?.name ?? '',
      task?.statusName ?? '',
      (metric.key === 'completed' ? task?.completedAt : task?.dueDate) ?? '',
    ]
  })
}

export const buildExportDetails = (rows, metrics, lookup) => {
  const listed = metrics.filter((metric) => metric.kind !== 'percent' && metric.kind !== 'total')
  const all = rows.flatMap((row) =>
    listed.flatMap((metric) =>
      detailItems(row, metric, lookup).map((item) => [row.fullName, row.teamName ?? '', metric.label, ...item]),
    ),
  )
  return {
    columns: ['Team member', 'Team', 'Column', 'Item', 'Client', 'Status', 'Due / done / since'],
    rows: all.slice(0, DETAIL_LIMIT),
    truncated: all.length > DETAIL_LIMIT,
  }
}

const csvLine = (values) => values.map((value) => `"${safeText(value).replace(/"/g, '""')}"`).join(',')

export const toCsv = (table) =>
  [
    csvLine(table.columns.map((column) => column.label)),
    ...table.rows.map((row) =>
      csvLine(
        row.cells.map((value, cellIndex) => {
          if (table.columns[cellIndex].kind === 'percent') return value === null ? '' : `${value}%`
          const note = row.notes?.[cellIndex]
          return note ? `${value} (${note.split('\n').join('; ')})` : value
        }),
      ),
    ),
  ].join('\n')

export const toWorkbook = (table, details, { title, subtitle, filename }) => ({
  title,
  subtitle,
  filename,
  sheetName: 'Tracker',
  columns: table.columns,
  rows: table.rows,
  details,
})
