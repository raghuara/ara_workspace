import { Box } from '@mui/material'
import { EMPLOYMENT_STATUS, INTERVIEW_STATUS, PERFORMANCE_STATUS, RECOMMENDATIONS } from '@/constants/domain'
import { STATUS_TONES } from '@/constants/workspaceDomain'

const STATUS_TONE_MAP = {
  [EMPLOYMENT_STATUS.ACTIVE]: 'green',
  [EMPLOYMENT_STATUS.PROBATION]: 'amber',
  [EMPLOYMENT_STATUS.NOTICE_PERIOD]: 'orange',
  [EMPLOYMENT_STATUS.INACTIVE]: 'gray',

  [INTERVIEW_STATUS.SCHEDULED]: 'blue',
  [INTERVIEW_STATUS.RESCHEDULED]: 'amber',
  [INTERVIEW_STATUS.CANCELLED]: 'rose',

  [PERFORMANCE_STATUS.DRAFT]: 'gray',
  [PERFORMANCE_STATUS.IN_PROGRESS]: 'blue',
  [PERFORMANCE_STATUS.PENDING_EMPLOYEE]: 'amber',
  Completed: 'green',

  [RECOMMENDATIONS.STRONG_HIRE]: 'green',
  [RECOMMENDATIONS.HIRE]: 'teal',
  [RECOMMENDATIONS.HOLD]: 'amber',
  [RECOMMENDATIONS.NO_HIRE]: 'rose',
}

const toneForStatus = (status) => STATUS_TONE_MAP[status] ?? 'slate'

export const StatusChip = ({ status, label, tone, size = 'medium', sx }) => {
  const text = label ?? status ?? ''
  const palette = STATUS_TONES[tone ?? toneForStatus(status)] ?? STATUS_TONES.slate
  const compact = size === 'small'
  const ring = compact ? 10 : 12

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? 0.5 : 0.625,
        height: compact ? 20 : 24,
        px: compact ? 0.875 : 1.125,
        borderRadius: 999,
        bgcolor: palette.strong,
        color: '#FFFFFF',
        fontSize: compact ? '0.625rem' : '0.6875rem',
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        maxWidth: '100%',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.14), 0 1px 2px rgba(15,23,42,0.14)',
        ...sx,
      }}
    >
      <Box
        component="span"
        aria-hidden="true"
        sx={{
          width: ring,
          height: ring,
          flexShrink: 0,
          borderRadius: '50%',
          border: '2px solid currentColor',
          display: 'grid',
          placeItems: 'center',
          '&::after': {
            content: '""',
            width: compact ? 3 : 4,
            height: compact ? 3 : 4,
            borderRadius: '50%',
            bgcolor: 'currentColor',
          },
        }}
      />
      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {text}
      </Box>
    </Box>
  )
}
