import { Fragment, useState } from 'react'
import {
  Box,
  ButtonBase,
  IconButton,
  Popover,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import { ChevronDown, Info, X } from 'lucide-react'
import { UserAvatar } from '@/components/UserAvatar'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { colors } from '@/theme/tokens'
import { METRICS, SECTIONS, completionTone, formatPercent, isIdle, overline } from './trackerModel'
import { TrackerDetailPopover } from './TrackerDetailPopover'

const headCell = {
  ...overline,
  py: 1,
  bgcolor: colors.page,
  borderBottom: `1px solid ${colors.border}`,
  whiteSpace: 'nowrap',
}

const sectionSpans = (metrics) =>
  metrics.reduce((spans, metric) => {
    const last = spans[spans.length - 1]
    if (last && last.section === metric.section) last.count += 1
    else spans.push({ section: metric.section, count: 1 })
    return spans
  }, [])

export const FilterChip = ({ selected, onClick, children }) => (
  <Box
    component="button"
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.625,
      height: 28,
      px: 1.25,
      border: `1px solid ${selected ? colors.brand : colors.border}`,
      borderRadius: 999,
      bgcolor: selected ? colors.brand : colors.surface,
      color: selected ? '#FFFFFF' : colors.textPrimary,
      font: 'inherit',
      fontSize: '0.75rem',
      fontWeight: selected ? 650 : 500,
      whiteSpace: 'nowrap',
      cursor: 'pointer',
      transition: 'background-color 120ms ease, border-color 120ms ease',
      '&:hover': { borderColor: colors.brand },
    }}
  >
    {children}
  </Box>
)

export const TrackerHelpButton = ({ metrics = METRICS }) => {
  const [anchor, setAnchor] = useState(null)
  return (
    <>
      <Tooltip title="How these columns are counted">
        <IconButton size="small" aria-label="How these columns are counted" onClick={(event) => setAnchor(event.currentTarget)}>
          <Info size={15} strokeWidth={1.75} />
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 360, maxWidth: 'calc(100vw - 24px)', p: 2, borderRadius: 2.5 } } }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
          <Typography variant="h4" component="h3" sx={{ flex: 1 }}>
            How this is counted
          </Typography>
          <IconButton size="small" aria-label="Close" onClick={() => setAnchor(null)}>
            <X size={14} strokeWidth={2} />
          </IconButton>
        </Stack>
        <Stack spacing={0.875}>
          {metrics.map((metric) => (
            <Box key={metric.key}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {metric.label}
              </Typography>
              <Typography variant="caption" component="p">
                {metric.help}
              </Typography>
            </Box>
          ))}
          <Typography variant="caption" component="p" sx={{ color: colors.textSecondary, pt: 0.5 }}>
            Click any count to see the tasks, clients or tickets behind it.
          </Typography>
        </Stack>
      </Popover>
    </>
  )
}

export const TrackerSummary = ({ headline, totals }) => {
  const tiles = [
    { label: 'People worked', value: `${totals.active}/${totals.people}`, tone: 'violet' },
    { label: 'Total assigned', value: totals.total, tone: 'blue' },
    { label: 'Completed', value: totals.completed, tone: 'green' },
    { label: 'In review', value: totals.inReview, tone: 'violet' },
    { label: 'In progress', value: totals.inProgress, tone: 'amber' },
    { label: 'Overdue', value: totals.overdue, tone: 'rose' },
  ]

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'auto minmax(0, 1fr)' },
        gap: 1.5,
        px: 1.75,
        py: 1.5,
        borderBottom: `1px solid ${colors.border}`,
        alignItems: 'stretch',
      }}
    >
      <Stack
        direction="row"
        spacing={1.25}
        sx={{ alignItems: 'center', px: 1.5, py: 1, borderRadius: 2, bgcolor: colors.brand, color: '#FFFFFF', minWidth: 0 }}
      >
        {headline}
        <Box sx={{ flex: 1 }} />
        <Box sx={{ pl: 1.5, ml: 0.5, borderLeft: '1px solid rgba(255,255,255,0.28)', textAlign: 'right' }}>
          <Typography sx={{ ...overline, color: 'inherit', opacity: 0.85 }}>Completion</Typography>
          <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>
            {formatPercent(totals.completionRate)}
          </Typography>
        </Box>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', xl: 'repeat(6, minmax(0, 1fr))' },
          gap: 1,
        }}
      >
        {tiles.map((tile) => {
          const tone = STATUS_TONES[tile.tone]
          return (
            <Box key={tile.label} sx={{ px: 1.25, py: 0.75, borderRadius: 2, bgcolor: tone.soft, border: `1px solid ${tone.border}`, minWidth: 0 }}>
              <Typography component="p" noWrap sx={{ ...overline, color: tone.strong }}>
                {tile.label}
              </Typography>
              <Typography component="p" sx={{ fontSize: '1.125rem', fontWeight: 700, lineHeight: 1.3, fontVariantNumeric: 'tabular-nums' }}>
                {tile.value}
              </Typography>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

export const CompletionPill = ({ percent, compact = false }) => {
  const tone = STATUS_TONES[completionTone(percent)]
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'flex-end', minWidth: 0 }}>
      {compact ? null : (
        <Box
          sx={{
            display: { xs: 'none', xl: 'block' },
            flex: 1,
            maxWidth: 80,
            height: 6,
            borderRadius: 999,
            bgcolor: colors.neutralSoft,
            overflow: 'hidden',
          }}
        >
          <Box sx={{ width: `${Math.min(100, percent ?? 0)}%`, height: '100%', borderRadius: 999, bgcolor: tone.strong, transition: 'width 320ms ease' }} />
        </Box>
      )}
      <Box
        component="span"
        sx={{
          minWidth: 64,
          px: 1,
          py: 0.375,
          borderRadius: 1.5,
          bgcolor: percent === null ? 'transparent' : tone.soft,
          border: `1px solid ${percent === null ? 'transparent' : tone.border}`,
          color: percent === null ? colors.textSecondary : tone.strong,
          fontSize: '0.8125rem',
          fontWeight: 700,
          textAlign: 'center',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatPercent(percent)}
      </Box>
    </Stack>
  )
}

const CountButton = ({ metric, value, onOpen, align = 'right' }) => {
  const tone = STATUS_TONES[metric.tone]
  const active = value > 0
  const number = (
    <Typography
      component="span"
      sx={{
        fontSize: '0.875rem',
        fontWeight: active ? (metric.strong ? 800 : 700) : 400,
        color: active ? (metric.strong ? colors.textPrimary : tone.strong) : colors.textSecondary,
        fontVariantNumeric: 'tabular-nums',
        opacity: active ? 1 : 0.6,
      }}
    >
      {value}
    </Typography>
  )

  if (!active || !onOpen) {
    return <Box sx={{ display: 'flex', justifyContent: align === 'right' ? 'flex-end' : 'center', pr: align === 'right' ? 1.75 : 0 }}>{number}</Box>
  }

  return (
    <Tooltip title={`See ${metric.label.toLowerCase()}`} enterDelay={400}>
      <ButtonBase
        onClick={onOpen}
        aria-haspopup="dialog"
        aria-label={`${value} ${metric.label} — see details`}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.25,
          ml: align === 'right' ? 'auto' : 0,
          px: 0.75,
          py: 0.25,
          borderRadius: 1.5,
          border: '1px solid transparent',
          transition: 'background-color 120ms ease, border-color 120ms ease',
          '& .count-caret': { opacity: 0.45, transition: 'opacity 120ms ease, transform 120ms ease' },
          '&:hover, &:focus-visible': { bgcolor: colors.surface, borderColor: tone.border, boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)' },
          '&:hover .count-caret, &:focus-visible .count-caret': { opacity: 1, transform: 'translateY(1px)' },
        }}
      >
        {number}
        <Box component="span" className="count-caret" sx={{ display: 'inline-flex', color: tone.strong }}>
          <ChevronDown size={13} strokeWidth={2.25} aria-hidden="true" />
        </Box>
      </ButtonBase>
    </Tooltip>
  )
}

const PersonCell = ({ row }) => (
  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
    <UserAvatar name={row.fullName} size={30} />
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
        {row.fullName}
      </Typography>
      {row.teamName ? (
        <Typography variant="caption" component="p" noWrap sx={{ color: colors.textSecondary }}>
          {row.teamName}
        </Typography>
      ) : null}
    </Box>
  </Stack>
)

const RoleBadge = ({ row }) => {
  if (!row.isLead && !row.oversees) return null
  const tone = STATUS_TONES[row.isLead ? 'violet' : 'teal']
  return (
    <Box
      component="span"
      sx={{
        flexShrink: 0,
        px: 0.625,
        borderRadius: 999,
        bgcolor: tone.soft,
        border: `1px solid ${tone.border}`,
        color: tone.strong,
        fontSize: '0.5625rem',
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        lineHeight: 1.6,
      }}
    >
      {row.isLead ? 'Lead' : 'Oversees'}
    </Box>
  )
}

const RoleCell = ({ row }) => (
  <Stack direction="row" spacing={0.75} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
    <Typography variant="body2" noWrap sx={{ color: colors.textPrimary }}>
      {row.designation}
    </Typography>
    <RoleBadge row={row} />
  </Stack>
)

const MemberCell = ({ row }) => (
  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
    <UserAvatar name={row.fullName} size={28} />
    <Box sx={{ minWidth: 0 }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
          {row.fullName}
        </Typography>
        <RoleBadge row={row} />
      </Stack>
      <Typography variant="caption" component="p" noWrap sx={{ color: colors.textSecondary }}>
        {[row.designation, row.teamName].filter(Boolean).join(' · ')}
      </Typography>
    </Box>
  </Stack>
)

const TableHeader = ({ metrics }) => (
  <TableHead>
    <TableRow>
      <TableCell sx={{ ...headCell, borderBottom: 0 }} />
      {sectionSpans(metrics).map((span, index) => {
        const tone = STATUS_TONES[SECTIONS[span.section].tone]
        return (
          <TableCell
            key={`${span.section}-${index}`}
            colSpan={span.count}
            align="center"
            sx={{ ...headCell, bgcolor: tone.tint, color: tone.strong, borderBottom: 0, borderLeft: `2px solid ${colors.surface}` }}
          >
            {SECTIONS[span.section].label}
          </TableCell>
        )
      })}
    </TableRow>
    <TableRow>
      <TableCell sx={{ ...headCell, minWidth: 190 }}>Team member</TableCell>
      {metrics.map((metric) => (
        <TableCell
          key={metric.key}
          align="right"
          sx={{
            ...headCell,
            width: metric.kind === 'percent' ? 96 : 72,
            whiteSpace: 'normal',
            lineHeight: 1.25,
            bgcolor: STATUS_TONES[SECTIONS[metric.section].tone].soft,
          }}
        >
          {metric.label}
        </TableCell>
      ))}
    </TableRow>
  </TableHead>
)

const PersonRow = ({ row, metrics, onOpen }) => {
  const idle = isIdle(row)
  return (
    <TableRow
      hover
      sx={{
        '& td': { py: 0.75 },
        '& td:first-of-type': {
          boxShadow: `inset 3px 0 0 ${idle ? 'transparent' : STATUS_TONES[completionTone(row.completionRate)].strong}`,
        },
        '& td.idle-dim': { opacity: idle ? 0.62 : 1 },
      }}
    >
      <TableCell className="idle-dim">
        <MemberCell row={row} />
      </TableCell>
      {metrics.map((metric) => (
        <TableCell
          key={metric.key}
          align="right"
          className={metric.kind === 'clients' ? undefined : 'idle-dim'}
          sx={{
            bgcolor:
              metric.shaded && row[metric.key] > 0 ? STATUS_TONES[metric.tone].soft : metric.strong ? colors.page : 'transparent',
          }}
        >
          {metric.kind === 'percent' ? (
            idle ? (
              <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                No work
              </Typography>
            ) : (
              <CompletionPill percent={row.completionRate} compact />
            )
          ) : (
            <CountButton metric={metric} value={row[metric.key]} onOpen={(event) => onOpen(event, row, metric)} />
          )}
        </TableCell>
      ))}
    </TableRow>
  )
}

const TotalsRow = ({ label, caption, totals, metrics, highlight = false }) => (
  <TableRow sx={{ '& td': { bgcolor: highlight ? colors.brandSoft : colors.page, py: 1 } }}>
    <TableCell>
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ fontWeight: 700, color: colors.textPrimary }}>
          {label}
        </Typography>
        {caption ? (
          <Typography variant="caption" sx={{ color: colors.textSecondary }}>
            {caption}
          </Typography>
        ) : null}
      </Stack>
    </TableCell>
    {metrics.map((metric) => (
      <TableCell key={metric.key} align="right">
        {metric.kind === 'percent' ? (
          <CompletionPill percent={totals.completionRate} compact />
        ) : (
          <Typography
            component="span"
            sx={{ pr: 1.75, fontSize: '0.875rem', fontWeight: 800, color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}
          >
            {totals[metric.key]}
          </Typography>
        )}
      </TableCell>
    ))}
  </TableRow>
)

const PersonCard = ({ row, metrics, onOpen }) => {
  const idle = isIdle(row)
  const counts = metrics.filter((metric) => metric.kind !== 'percent')
  const showRate = metrics.some((metric) => metric.kind === 'percent')
  return (
    <Box
      sx={{
        px: 1.75,
        py: 1.25,
        borderBottom: `1px solid ${colors.border}`,
        borderLeft: `3px solid ${idle ? 'transparent' : STATUS_TONES[completionTone(row.completionRate)].strong}`,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1, opacity: idle ? 0.62 : 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <PersonCell row={row} />
        </Box>
        {showRate ? (
          idle ? (
            <Typography variant="caption" sx={{ color: colors.textSecondary }}>
              No work
            </Typography>
          ) : (
            <CompletionPill percent={row.completionRate} compact />
          )
        ) : null}
      </Stack>
      <Box sx={{ mb: 1, pl: 5.25 }}>
        <RoleCell row={row} />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: 0.5 }}>
        {counts.map((metric) => {
          const value = row[metric.key]
          const tone = STATUS_TONES[metric.tone]
          return (
            <Box
              key={metric.key}
              component={value > 0 ? 'button' : 'div'}
              type={value > 0 ? 'button' : undefined}
              onClick={value > 0 ? (event) => onOpen(event, row, metric) : undefined}
              sx={{
                px: 0.5,
                py: 0.5,
                border: `1px solid ${value > 0 ? tone.border : 'transparent'}`,
                borderRadius: 1.5,
                textAlign: 'center',
                bgcolor: value > 0 ? tone.soft : colors.neutralSoft,
                font: 'inherit',
                cursor: value > 0 ? 'pointer' : 'default',
                minWidth: 0,
              }}
            >
              <Typography component="span" noWrap sx={{ ...overline, display: 'block', color: value > 0 ? tone.strong : colors.textSecondary }}>
                {metric.short}
              </Typography>
              <Typography
                component="span"
                sx={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: value > 0 ? 700 : 400,
                  color: value > 0 ? tone.strong : colors.textSecondary,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {value}
              </Typography>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

const DayBand = ({ day }) => (
  <Stack
    direction="row"
    spacing={1}
    useFlexGap
    sx={{
      alignItems: 'center',
      flexWrap: 'wrap',
      px: 1.75,
      py: 0.875,
      bgcolor: day.weekend ? colors.neutralSoft : colors.brandSoft,
      borderBottom: `1px solid ${colors.border}`,
    }}
  >
    <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
      {day.medium}
    </Typography>
    <Box component="span" sx={{ ...overline, px: 0.75, py: '1px', borderRadius: 999, bgcolor: colors.surface, border: `1px solid ${colors.border}` }}>
      {day.weekdayShort}
    </Box>
    <Box sx={{ flex: 1 }} />
    <Typography variant="caption" sx={{ color: colors.textSecondary, whiteSpace: 'nowrap' }}>
      {day.totals.total} assigned · {day.totals.completed} done
    </Typography>
  </Stack>
)

const useDetail = () => {
  const [detail, setDetail] = useState(null)
  const open = (context) => (event, row, metric) => setDetail({ anchorEl: event.currentTarget, row, metric, context })
  return [detail, open, () => setDetail(null)]
}

const minWidthFor = (metrics) => 220 + metrics.length * 76

export const TrackerPersonTable = ({ rows, totals, metrics, lookup, context }) => {
  const [detail, open, close] = useDetail()
  const onOpen = open(context)

  return (
    <>
      <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
        <Table size="small" sx={{ minWidth: minWidthFor(metrics), '& td, & th': { borderColor: colors.border, px: 1 } }}>
          <TableHeader metrics={metrics} />
          <TableBody>
            {rows.map((row) => (
              <PersonRow key={row.id} row={row} metrics={metrics} onOpen={onOpen} />
            ))}
          </TableBody>
          <TableFooter>
            <TotalsRow label="Total" caption={`${totals.active} of ${totals.people} people worked`} totals={totals} metrics={metrics} />
          </TableFooter>
        </Table>
      </TableContainer>
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        {rows.map((row) => (
          <PersonCard key={row.id} row={row} metrics={metrics} onOpen={onOpen} />
        ))}
      </Box>
      <TrackerDetailPopover detail={detail} lookup={lookup} onClose={close} />
    </>
  )
}

export const TrackerDayTable = ({ days, totals, metrics, lookup }) => {
  const [detail, open, close] = useDetail()

  return (
    <>
      <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
        <Table size="small" sx={{ minWidth: minWidthFor(metrics), '& td, & th': { borderColor: colors.border, px: 1 } }}>
          <TableHeader metrics={metrics} />
          <TableBody>
            {days.map((day) => (
              <Fragment key={day.date}>
                <TableRow>
                  <TableCell
                    colSpan={1 + metrics.length}
                    sx={{ bgcolor: day.weekend ? colors.neutralSoft : colors.brandSoft, py: 0.875, borderTop: `2px solid ${colors.border}` }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {day.medium}
                      </Typography>
                      <Box
                        component="span"
                        sx={{ ...overline, px: 0.75, py: '1px', borderRadius: 999, bgcolor: colors.surface, border: `1px solid ${colors.border}` }}
                      >
                        {day.weekdayShort}
                      </Box>
                      <Box sx={{ flex: 1 }} />
                      <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                        {day.totals.active} people · {day.totals.total} assigned · {day.totals.completed} done
                      </Typography>
                      <Box sx={{ width: 96 }}>
                        <CompletionPill percent={day.totals.completionRate} compact />
                      </Box>
                    </Stack>
                  </TableCell>
                </TableRow>
                {day.rows.map((row) => (
                  <PersonRow key={`${day.date}-${row.id}`} row={row} metrics={metrics} onOpen={open(`${day.weekdayShort}, ${day.medium}`)} />
                ))}
              </Fragment>
            ))}
          </TableBody>
          <TableFooter>
            <TotalsRow label="Period total" caption={`${days.length} working days`} totals={totals} metrics={metrics} highlight />
          </TableFooter>
        </Table>
      </TableContainer>
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        {days.map((day) => (
          <Box key={day.date}>
            <DayBand day={day} />
            {day.rows.map((row) => (
              <PersonCard key={`${day.date}-${row.id}`} row={row} metrics={metrics} onOpen={open(`${day.weekdayShort}, ${day.medium}`)} />
            ))}
          </Box>
        ))}
      </Box>
      <TrackerDetailPopover detail={detail} lookup={lookup} onClose={close} />
    </>
  )
}
