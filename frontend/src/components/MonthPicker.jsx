import { useState } from 'react'
import { Box, Popover, Tooltip, Typography } from '@mui/material'
import {
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  RotateCcw,
} from 'lucide-react'
import { usePeriod } from '@/hooks/usePeriod'
import { colors } from '@/theme/tokens'
import { fiscalYearLabel } from '@/utils/fiscalYear'

const focusRing = { outline: 'none', boxShadow: `0 0 0 2px ${colors.surface}, 0 0 0 4px ${colors.brand}` }
const selectedShadow = '0 4px 10px -3px rgba(37, 99, 235, 0.55)'

const plainButton = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 0,
  m: 0,
  font: 'inherit',
  cursor: 'pointer',
  bgcolor: 'transparent',
  color: 'inherit',
  '&:focus-visible': focusRing,
  '&:disabled': { cursor: 'not-allowed' },
}

const sectionLabelSx = {
  fontSize: '0.6875rem',
  fontWeight: 700,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  color: colors.textSecondary,
}

/** Monday of the week the given day falls in. */
const startOfWeek = (iso) => {
  const date = new Date(`${iso}T12:00:00`)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return date.toISOString().slice(0, 10)
}

const StepButton = ({ target, direction, onGo, sx }) => {
  const Icon = direction < 0 ? ChevronLeft : ChevronRight
  const button = (
    <Box
      component="button"
      type="button"
      disabled={!target}
      onClick={() => onGo(target)}
      aria-label={target ? `Go to ${target.label}` : direction < 0 ? 'No earlier period' : 'No later period'}
      sx={{
        ...plainButton,
        flexShrink: 0,
        width: 32,
        alignSelf: 'stretch',
        color: colors.textSecondary,
        transition: 'background-color 140ms ease, color 140ms ease',
        '&:hover:not(:disabled)': { bgcolor: colors.neutralSoft, color: colors.textPrimary },
        '&:disabled': { cursor: 'not-allowed', color: '#CBD5E1' },
        '&:focus-visible': { outline: 'none', boxShadow: `inset 0 0 0 2px ${colors.brand}` },
        ...sx,
      }}
    >
      <Icon size={16} strokeWidth={2} aria-hidden="true" />
    </Box>
  )
  return target ? (
    <Tooltip title={`${direction < 0 ? 'Previous' : 'Next'} · ${target.label}`}>{button}</Tooltip>
  ) : (
    button
  )
}

const YearArrow = ({ direction, disabled, onClick }) => {
  const Icon = direction < 0 ? ChevronLeft : ChevronRight
  return (
    <Box
      component="button"
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={direction < 0 ? 'Previous financial year' : 'Next financial year'}
      sx={{
        ...plainButton,
        width: 30,
        height: 30,
        borderRadius: 1.5,
        border: `1px solid ${colors.border}`,
        color: colors.textPrimary,
        transition: 'background-color 140ms ease, border-color 140ms ease',
        '&:hover:not(:disabled)': { bgcolor: colors.brandSoft, borderColor: colors.brand, color: colors.brandDark },
        '&:disabled': { cursor: 'not-allowed', color: '#CBD5E1', borderColor: colors.neutralSoft },
      }}
    >
      <Icon size={16} strokeWidth={2} aria-hidden="true" />
    </Box>
  )
}

const MonthTile = ({ option, selected, onPick }) => (
  <Box
    component="button"
    type="button"
    disabled={option.disabled}
    onClick={() => onPick(option.key)}
    aria-pressed={selected}
    aria-label={`${option.label}${option.isCurrent ? ', this month' : ''}${option.disabled ? ', upcoming' : ''}`}
    sx={{
      ...plainButton,
      position: 'relative',
      height: 38,
      borderRadius: 1.5,
      fontSize: '0.8125rem',
      fontWeight: selected || option.isCurrent ? 700 : 500,
      border: `1px solid ${option.isCurrent && !selected ? colors.brand : 'transparent'}`,
      bgcolor: selected ? colors.brand : 'transparent',
      color: selected ? '#FFFFFF' : option.isCurrent ? colors.brand : colors.textPrimary,
      boxShadow: selected ? selectedShadow : 'none',
      transition: 'background-color 140ms ease, color 140ms ease, box-shadow 160ms ease, transform 120ms ease',
      '&:hover:not(:disabled)': {
        bgcolor: selected ? colors.brandDark : colors.brandSoft,
        color: selected ? '#FFFFFF' : colors.brandDark,
      },
      '&:active:not(:disabled)': { transform: 'scale(0.96)' },
      '&:disabled': { cursor: 'not-allowed', color: '#CBD5E1' },
    }}
  >
    {option.short}
    {option.isCurrent ? (
      <Box
        component="span"
        aria-hidden="true"
        sx={{
          position: 'absolute',
          bottom: 5,
          left: '50%',
          width: 4,
          height: 4,
          ml: '-2px',
          borderRadius: '50%',
          bgcolor: selected ? '#FFFFFF' : colors.brand,
        }}
      />
    ) : null}
  </Box>
)

const groupByCalendarYear = (months) =>
  months.reduce((sections, option) => {
    const last = sections[sections.length - 1]
    if (last && last.year === option.year) last.months.push(option)
    else sections.push({ year: option.year, months: [option] })
    return sections
  }, [])

export const MonthPicker = ({ height = 36, hint, sx }) => {
  const {
    year,
    yearLabel,
    month,
    selectedMonth,
    startMonth,
    currentYear,
    todayKey,
    oldestYear,
    monthsFor,
    isCurrentPeriod,
    previous,
    next,
    setPeriod,
    resetToToday,
    day,
    today,
    dayLabel,
    setDay,
    clearDay,
    yearRange,
    custom,
    setRange,
  } = usePeriod()
  const [anchor, setAnchor] = useState(null)
  const [viewYear, setViewYear] = useState(year)
  const open = Boolean(anchor)

  const openPicker = (event) => {
    setViewYear(year)
    setAnchor(event.currentTarget)
  }
  const close = () => setAnchor(null)
  const pick = (key) => {
    setPeriod(viewYear, key)
    close()
  }

  const viewMonths = monthsFor(viewYear)
  const sections = groupByCalendarYear(viewMonths)
  const showingViewYear = viewYear === year
  const entireSelected = showingViewYear && month === 'all' && !day && !custom
  const label = custom ? custom.label : day ? dayLabel(day) : selectedMonth ? selectedMonth.label : `FY ${yearLabel}`

  const chooseDay = (iso) => {
    setDay(iso)
    close()
  }

  const presets = [
    { key: 'today', label: 'Today', active: day === today, apply: () => setDay(today) },
    {
      key: 'week',
      label: 'This week',
      active: custom?.label === 'This week',
      apply: () => setRange(startOfWeek(today), today, 'This week'),
    },
    {
      key: 'mtd',
      label: 'Month to date',
      active: custom?.label === 'Month to date',
      apply: () => setRange(`${today.slice(0, 7)}-01`, today, 'Month to date'),
    },
    {
      key: 'month',
      label: 'This month',
      active: !day && !custom && selectedMonth?.key === todayKey,
      apply: () => resetToToday(),
    },
    {
      key: 'year',
      label: 'Entire year',
      active: entireSelected,
      apply: () => setPeriod(currentYear, 'all'),
    },
  ]

  const applyPreset = (preset) => {
    preset.apply()
    close()
  }

  return (
    <>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'stretch',
          flexShrink: 0,
          height,
          border: `1px solid ${open ? colors.brand : '#BFD3F8'}`,
          borderRadius: 1.5,
          bgcolor: colors.surface,
          overflow: 'hidden',
          boxShadow: open ? `0 0 0 3px ${colors.brandSoft}` : 'none',
          transition: 'border-color 140ms ease, box-shadow 140ms ease',
          '&:hover': { borderColor: open ? colors.brand : '#CBD5E1' },
          ...sx,
        }}
      >
        <StepButton target={previous} direction={-1} onGo={(target) => setPeriod(target.year, target.month, target.day ?? null)} />
        <Box
          component="button"
          type="button"
          onClick={openPicker}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`Showing ${selectedMonth ? selectedMonth.label : `the entire financial year ${yearLabel}`}. Change period`}
          sx={{
            ...plainButton,
            flex: 1,
            minWidth: 132,
            gap: 0.875,
            px: 1.25,
            borderLeft: `1px solid ${colors.border}`,
            borderRight: `1px solid ${colors.border}`,
            bgcolor: colors.brandSoft,
            color: colors.brandDark,
            fontSize: '0.8125rem',
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
            transition: 'background-color 140ms ease',
            '&:hover': { bgcolor: colors.brandTint },
            '&:focus-visible': { outline: 'none', boxShadow: `inset 0 0 0 2px ${colors.brand}` },
          }}
        >
          {selectedMonth ? (
            <CalendarDays size={15} strokeWidth={1.75} color={colors.brand} aria-hidden="true" />
          ) : (
            <CalendarRange size={15} strokeWidth={1.75} color={colors.brand} aria-hidden="true" />
          )}
          <Box component="span" sx={{ flex: { xs: 1, md: 'none' }, textAlign: 'left' }}>
            {label}
          </Box>
          <Box
            component="span"
            sx={{
              display: 'inline-flex',
              color: colors.textSecondary,
              transition: 'transform 160ms ease',
              transform: open ? 'rotate(180deg)' : 'none',
            }}
          >
            <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
          </Box>
        </Box>
        <StepButton target={next} direction={1} onGo={(target) => setPeriod(target.year, target.month, target.day ?? null)} />
      </Box>

      <Popover
        open={open}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{
          paper: {
            role: 'dialog',
            'aria-label': 'Choose a period',
            sx: {
              width: 316,
              maxWidth: 'calc(100vw - 24px)',
              mt: 1,
              borderRadius: 2.5,
              border: `1px solid ${colors.border}`,
              boxShadow: '0 18px 44px rgba(15, 23, 42, 0.16), 0 2px 6px rgba(15, 23, 42, 0.06)',
              overflow: 'hidden',
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, pt: 1.5, pb: 1.25 }}>
          <YearArrow
            direction={-1}
            disabled={viewYear <= oldestYear}
            onClick={() => setViewYear((value) => value - 1)}
          />
          <Box sx={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
            <Typography
              sx={{ fontSize: '0.875rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 }}
            >
              FY {fiscalYearLabel(viewYear, startMonth)}
            </Typography>
            <Typography variant="caption" component="p" sx={{ color: colors.textSecondary, lineHeight: 1.4 }}>
              {viewMonths[0].label} – {viewMonths[11].label}
              {viewYear === currentYear ? ' · Current' : ''}
            </Typography>
          </Box>
          <YearArrow
            direction={1}
            disabled={viewYear >= currentYear}
            onClick={() => setViewYear((value) => value + 1)}
          />
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, px: 1.5, pb: 1.25 }}>
          {presets.map((preset) => (
            <Box
              key={preset.key}
              component="button"
              type="button"
              onClick={() => applyPreset(preset)}
              aria-pressed={preset.active}
              sx={{
                ...plainButton,
                height: 28,
                px: 1.125,
                borderRadius: 999,
                border: `1px solid ${preset.active ? colors.brand : colors.border}`,
                bgcolor: preset.active ? colors.brandSoft : colors.surface,
                color: preset.active ? colors.brandDark : colors.textSecondary,
                fontSize: '0.75rem',
                fontWeight: preset.active ? 700 : 500,
                '&:hover': { borderColor: colors.brand, color: colors.brandDark },
              }}
            >
              {preset.label}
            </Box>
          ))}
        </Box>

        <Box sx={{ px: 1.5 }}>
          <Box
            component="button"
            type="button"
            onClick={() => pick('all')}
            aria-pressed={entireSelected}
            sx={{
              ...plainButton,
              width: '100%',
              justifyContent: 'flex-start',
              gap: 1,
              height: 40,
              px: 1.25,
              borderRadius: 1.5,
              border: `1px solid ${entireSelected ? colors.brand : colors.border}`,
              bgcolor: entireSelected ? colors.brand : colors.page,
              color: entireSelected ? '#FFFFFF' : colors.textPrimary,
              boxShadow: entireSelected ? selectedShadow : 'none',
              fontSize: '0.8125rem',
              fontWeight: 600,
              transition: 'background-color 140ms ease, border-color 140ms ease, color 140ms ease',
              '&:hover': entireSelected
                ? { bgcolor: colors.brandDark }
                : { bgcolor: colors.brandSoft, borderColor: colors.brand, color: colors.brandDark },
            }}
          >
            <CalendarRange size={15} strokeWidth={1.75} aria-hidden="true" />
            <Box component="span" sx={{ flex: 1, textAlign: 'left' }}>
              Entire year
            </Box>
            {entireSelected ? (
              <Check size={15} strokeWidth={2.25} aria-hidden="true" />
            ) : (
              <Box component="span" sx={{ fontSize: '0.75rem', fontWeight: 500, color: colors.textSecondary }}>
                12 months
              </Box>
            )}
          </Box>
        </Box>

        <Box sx={{ px: 1.5, pt: 1.25, pb: 1.5 }}>
          {sections.map((section, index) => (
            <Box key={section.year} sx={{ mt: index === 0 ? 0 : 1.25 }}>
              {sections.length > 1 ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                  <Typography component="p" sx={sectionLabelSx}>
                    {section.year}
                  </Typography>
                  <Box sx={{ flex: 1, height: '1px', bgcolor: colors.border }} />
                </Box>
              ) : null}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.5 }}>
                {section.months.map((option) => (
                  <MonthTile
                    key={option.key}
                    option={option}
                    selected={showingViewYear && option.key === month}
                    onPick={pick}
                  />
                ))}
              </Box>
            </Box>
          ))}
        </Box>

        <Box sx={{ px: 1.5, pb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
            <Typography component="p" sx={sectionLabelSx}>
              Or one day
            </Typography>
            <Box sx={{ flex: 1, height: '1px', bgcolor: colors.border }} />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box
              component="input"
              type="date"
              aria-label="Show a single day"
              value={day ?? ''}
              min={yearRange.from}
              max={today < yearRange.to ? today : yearRange.to}
              onChange={(event) => (event.target.value ? chooseDay(event.target.value) : clearDay())}
              sx={{
                flex: 1,
                minWidth: 0,
                height: 36,
                px: 1.25,
                border: `1px solid ${day ? colors.brand : colors.border}`,
                borderRadius: 1.5,
                bgcolor: day ? colors.brandSoft : colors.surface,
                color: day ? colors.brandDark : colors.textPrimary,
                font: 'inherit',
                fontSize: '0.8125rem',
                fontWeight: day ? 650 : 500,
                fontVariantNumeric: 'tabular-nums',
                '&:focus-visible': focusRing,
              }}
            />

            <Box
              component="button"
              type="button"
              onClick={() => chooseDay(today)}
              aria-pressed={day === today}
              sx={{
                ...plainButton,
                flexShrink: 0,
                height: 36,
                px: 1.25,
                borderRadius: 1.5,
                border: `1px solid ${day === today ? colors.brand : colors.border}`,
                bgcolor: day === today ? colors.brand : colors.surface,
                color: day === today ? '#FFFFFF' : colors.textPrimary,
                fontSize: '0.8125rem',
                fontWeight: 600,
                '&:hover': { bgcolor: day === today ? colors.brandDark : colors.brandSoft },
              }}
            >
              Today
            </Box>
          </Box>

          {day ? (
            <Box
              component="button"
              type="button"
              onClick={() => {
                clearDay()
                close()
              }}
              sx={{
                ...plainButton,
                mt: 0.75,
                gap: 0.5,
                height: 28,
                px: 1,
                borderRadius: 1.5,
                color: colors.brand,
                fontSize: '0.75rem',
                fontWeight: 700,
                '&:hover': { bgcolor: colors.brandSoft, color: colors.brandDark },
              }}
            >
              <RotateCcw size={13} strokeWidth={2.25} aria-hidden="true" />
              Back to the whole month
            </Box>
          ) : null}
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            minHeight: 44,
            px: 1.5,
            py: 0.75,
            borderTop: `1px solid ${colors.border}`,
            bgcolor: colors.page,
          }}
        >
          {hint ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 0.75,
                flex: 1,
                minWidth: 0,
                color: colors.textSecondary,
              }}
            >
              <Box sx={{ display: 'inline-flex', pt: '2px', flexShrink: 0 }}>
                <Info size={13} strokeWidth={2} aria-hidden="true" />
              </Box>
              <Typography variant="caption" sx={{ color: 'inherit', lineHeight: 1.45 }}>
                {hint}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.625 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: colors.brand }} />
                <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                  This month
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.625 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#CBD5E1' }} />
                <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                  Upcoming
                </Typography>
              </Box>
            </Box>
          )}
          {!isCurrentPeriod ? (
            <Box
              component="button"
              type="button"
              onClick={() => {
                resetToToday()
                close()
              }}
              sx={{
                ...plainButton,
                flexShrink: 0,
                gap: 0.5,
                height: 28,
                px: 1,
                borderRadius: 1.5,
                color: colors.brand,
                fontSize: '0.75rem',
                fontWeight: 700,
                '&:hover': { bgcolor: colors.brandSoft, color: colors.brandDark },
              }}
            >
              <RotateCcw size={13} strokeWidth={2.25} aria-hidden="true" />
              This month
            </Box>
          ) : null}
        </Box>
      </Popover>
    </>
  )
}
