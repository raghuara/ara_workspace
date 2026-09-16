import { Box, Button, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { CalendarDays, CalendarRange } from 'lucide-react'
import { DUE_OFFSETS, RECURRENCE, WEEKDAYS, WEEKDAY_PRESETS } from '@/constants/workspaceDomain'
import { colors } from '@/theme/tokens'
import { describeSchedule, formatShortDay, nextOccurrences, todayIso } from '@/utils/recurrence'

const Pill = ({ label, selected, onClick, ariaLabel, wide = false }) => (
  <Box
    component="button"
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    aria-label={ariaLabel}
    sx={{
      minWidth: wide ? 44 : 36,
      height: 34,
      px: wide ? 1.25 : 0,
      borderRadius: 1.5,
      border: `1px solid ${selected ? colors.brand : colors.border}`,
      bgcolor: selected ? colors.brand : colors.surface,
      color: selected ? '#fff' : colors.textPrimary,
      fontSize: '0.8125rem',
      fontWeight: 600,
      cursor: 'pointer',
      fontVariantNumeric: 'tabular-nums',
      transition: 'background-color 120ms ease, border-color 120ms ease',
      '&:hover': { borderColor: colors.brand, bgcolor: selected ? colors.brandDark : colors.brandSoft },
    }}
  >
    {label}
  </Box>
)

const sameSet = (a, b) => a.length === b.length && a.every((value) => b.includes(value))

/**
 * Weekly (pick weekdays) or monthly (pick dates) with due offset, start/end
 * and a live preview of the next few runs.
 *
 * value: { schedule: { frequency, weekdays, monthDays }, dueOffsetDays, startDate, endDate }
 */
export const SchedulePicker = ({ value, onChange, errors = {} }) => {
  const { schedule, dueOffsetDays, startDate, endDate } = value
  const setSchedule = (patch) => onChange({ ...value, schedule: { ...schedule, ...patch } })
  const setField = (field, fieldValue) => onChange({ ...value, [field]: fieldValue })

  const toggleIn = (list, item) => (list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item])

  const previewFrom = startDate && startDate > todayIso() ? startDate : todayIso()
  const preview = nextOccurrences(schedule, { from: previewFrom, endDate: endDate || null, count: 4 })

  return (
    <Stack spacing={2}>
      <ToggleButtonGroup
        exclusive
        value={schedule.frequency}
        onChange={(_, frequency) => frequency && setSchedule({ frequency })}
        aria-label="How often"
        size="small"
        fullWidth
      >
        <ToggleButton value={RECURRENCE.WEEKLY} sx={{ gap: 0.75, textTransform: 'none', fontWeight: 600 }}>
          <CalendarDays size={15} strokeWidth={1.75} aria-hidden="true" />
          Weekly · pick days
        </ToggleButton>
        <ToggleButton value={RECURRENCE.MONTHLY} sx={{ gap: 0.75, textTransform: 'none', fontWeight: 600 }}>
          <CalendarRange size={15} strokeWidth={1.75} aria-hidden="true" />
          Monthly · pick dates
        </ToggleButton>
      </ToggleButtonGroup>

      {schedule.frequency === RECURRENCE.WEEKLY ? (
        <Box>
          <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', mb: 1 }} useFlexGap>
            {WEEKDAYS.map((day) => (
              <Pill
                key={day.value}
                wide
                label={day.short}
                ariaLabel={day.label}
                selected={schedule.weekdays.includes(day.value)}
                onClick={() => setSchedule({ weekdays: toggleIn(schedule.weekdays, day.value) })}
              />
            ))}
          </Stack>
          <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', alignItems: 'center' }} useFlexGap>
            <Typography variant="caption">Quick pick:</Typography>
            {WEEKDAY_PRESETS.map((preset) => (
              <Button
                key={preset.key}
                size="small"
                variant={sameSet(schedule.weekdays, preset.days) ? 'contained' : 'text'}
                onClick={() => setSchedule({ weekdays: preset.days })}
                sx={{ minWidth: 0, px: 1, py: 0.25, fontSize: '0.75rem' }}
              >
                {preset.label}
              </Button>
            ))}
            <Button size="small" variant="text" color="inherit" onClick={() => setSchedule({ weekdays: [] })} sx={{ minWidth: 0, px: 1, py: 0.25, fontSize: '0.75rem', color: colors.textSecondary }}>
              Clear
            </Button>
          </Stack>
        </Box>
      ) : (
        <Box>
          <Box sx={{ display: 'grid', gap: 0.75, gridTemplateColumns: 'repeat(auto-fill, minmax(36px, 1fr))', maxWidth: 420 }}>
            {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
              <Pill
                key={day}
                label={day}
                ariaLabel={`Day ${day}`}
                selected={schedule.monthDays.includes(day)}
                onClick={() => setSchedule({ monthDays: toggleIn(schedule.monthDays, day).sort((a, b) => a - b) })}
              />
            ))}
          </Box>
          <Typography variant="caption" component="p" sx={{ mt: 1 }}>
            Pick as many dates as you need. In shorter months a date that does not exist runs on the last day instead.
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          px: 1.5,
          py: 1.25,
          borderRadius: 2,
          border: `1px solid ${errors.schedule ? colors.danger : colors.border}`,
          bgcolor: errors.schedule ? colors.dangerSoft : colors.brandSoft,
        }}
      >
        <Typography variant="body2" fontWeight={650} sx={{ color: errors.schedule ? colors.danger : colors.brandDark }}>
          {errors.schedule ?? describeSchedule(schedule)}
        </Typography>
        {preview.length > 0 ? (
          <Typography variant="caption" component="p" sx={{ mt: 0.25 }}>
            Next: {preview.map(formatShortDay).join(' · ')}
          </Typography>
        ) : null}
      </Box>

      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}>
        <TextField
          select
          size="small"
          label="Due"
          value={dueOffsetDays}
          onChange={(event) => setField('dueOffsetDays', Number(event.target.value))}
          helperText="Counted from the day it is created"
        >
          {DUE_OFFSETS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          type="date"
          label="Starts on"
          value={startDate}
          onChange={(event) => setField('startDate', event.target.value)}
          error={Boolean(errors.startDate)}
          helperText={errors.startDate ?? 'First day it can run'}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          size="small"
          type="date"
          label="Ends on"
          value={endDate}
          onChange={(event) => setField('endDate', event.target.value)}
          error={Boolean(errors.endDate)}
          helperText={errors.endDate ?? 'Leave empty to run indefinitely'}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Box>
    </Stack>
  )
}
