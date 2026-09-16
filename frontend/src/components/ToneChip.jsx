import { Box } from '@mui/material'
import { STATUS_TONES } from '@/constants/workspaceDomain'

export const ToneChip = ({ label, tone = 'slate', icon: Icon, size = 'small', sx }) => {
  const palette = STATUS_TONES[tone] ?? STATUS_TONES.slate
  const compact = size === 'small'

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        borderRadius: 1.5,
        bgcolor: palette.soft,
        color: palette.strong,
        border: `1px solid ${palette.border}`,
        fontSize: compact ? '0.6875rem' : '0.75rem',
        fontWeight: 600,
        lineHeight: 1.6,
        px: compact ? 0.75 : 1,
        py: compact ? 0.125 : 0.375,
        maxWidth: '100%',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        ...sx,
      }}
    >
      {Icon ? <Icon size={compact ? 11 : 13} strokeWidth={2} aria-hidden="true" /> : null}
      {label}
    </Box>
  )
}
