import { Box, Stack, Typography } from '@mui/material'
import { RECURRENCE, WEEKDAYS } from '@/constants/workspaceDomain'
import { colors } from '@/theme/tokens'
import { describeSchedule, normaliseSchedule, ordinal } from '@/utils/recurrence'

const Dot = ({ label, on, title }) => (
  <Box
    component="span"
    title={title}
    aria-hidden="true"
    sx={{
      width: 20,
      height: 20,
      borderRadius: '5px',
      display: 'inline-grid',
      placeItems: 'center',
      fontSize: '0.625rem',
      fontWeight: 700,
      bgcolor: on ? colors.brand : colors.neutralSoft,
      color: on ? '#fff' : colors.textSecondary,
      border: `1px solid ${on ? colors.brand : colors.border}`,
    }}
  >
    {label}
  </Box>
)

/** Mon–Sun strip (or ordinal date chips) with the schedule sentence beneath. */
export const ScheduleBadges = ({ schedule, dense = false }) => {
  const rule = normaliseSchedule(schedule)
  return (
    <Box sx={{ minWidth: 0 }}>
      <Stack direction="row" spacing={0.375} sx={{ flexWrap: 'wrap', rowGap: 0.375 }} useFlexGap aria-label={describeSchedule(rule)}>
        {rule.frequency === RECURRENCE.WEEKLY
          ? WEEKDAYS.map((day) => <Dot key={day.value} label={day.letter} title={day.label} on={rule.weekdays.includes(day.value)} />)
          : rule.monthDays.slice(0, 8).map((day) => <Dot key={day} label={day} title={ordinal(day)} on />)}
        {rule.frequency === RECURRENCE.MONTHLY && rule.monthDays.length > 8 ? (
          <Typography variant="caption" sx={{ alignSelf: 'center' }}>
            +{rule.monthDays.length - 8}
          </Typography>
        ) : null}
      </Stack>
      {dense ? null : (
        <Typography variant="caption" component="p" noWrap sx={{ mt: 0.375 }}>
          {describeSchedule(rule)}
        </Typography>
      )}
    </Box>
  )
}
