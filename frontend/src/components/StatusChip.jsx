import { Chip } from '@mui/material'
import { colors } from '@/theme/tokens'

const TONES = {
  success: { bg: colors.successSoft, fg: colors.success },
  info: { bg: colors.brandSoft, fg: colors.brandDark },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  neutral: { bg: colors.neutralSoft, fg: colors.textSecondary },
}

const STATUS_TONES = {
  Active: 'success',
  Completed: 'success',
  'Strong Hire': 'success',
  'On Track': 'success',
  Scheduled: 'info',
  'In Progress': 'info',
  Hire: 'info',
  Probation: 'warning',
  Rescheduled: 'warning',
  Hold: 'warning',
  'Pending Employee': 'warning',
  'At Risk': 'warning',
  'Notice Period': 'warning',
  Inactive: 'danger',
  Cancelled: 'danger',
  'No Hire': 'danger',
  Draft: 'neutral',
}

export const StatusChip = ({ status, size = 'small' }) => {
  const tone = TONES[STATUS_TONES[status] ?? 'neutral']

  return (
    <Chip
      label={status}
      size={size}
      sx={{ bgcolor: tone.bg, color: tone.fg, border: 'none' }}
    />
  )
}
