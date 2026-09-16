import { Box, Stack, Tooltip, Typography } from '@mui/material'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { colors } from '@/theme/tokens'

export const StatusSplitBar = ({ segments, height = 6, legend = true, ariaLabel }) => {
  const shown = segments.filter((segment) => segment.count > 0)

  return (
    <Box role="img" aria-label={ariaLabel}>
      <Box sx={{ display: 'flex', gap: '2px', height, borderRadius: 999, overflow: 'hidden', bgcolor: colors.neutralSoft }}>
        {shown.map((segment) => {
          const tone = STATUS_TONES[segment.tone] ?? STATUS_TONES.slate
          return (
            <Tooltip key={segment.id ?? segment.name} title={`${segment.name}: ${segment.count}`}>
              <Box sx={{ flex: `${segment.count} 1 0%`, minWidth: 4, bgcolor: tone.strong, transition: 'flex 300ms ease' }} />
            </Tooltip>
          )
        })}
      </Box>

      {legend && shown.length > 0 ? (
        <Stack direction="row" spacing={1.25} useFlexGap sx={{ flexWrap: 'wrap', mt: 0.75 }}>
          {shown.map((segment) => {
            const tone = STATUS_TONES[segment.tone] ?? STATUS_TONES.slate
            return (
              <Stack key={segment.id ?? segment.name} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <Box aria-hidden="true" sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: tone.strong }} />
                <Typography variant="caption" sx={{ color: colors.textSecondary, whiteSpace: 'nowrap' }}>
                  {segment.name}{' '}
                  <Box component="span" sx={{ fontWeight: 700, color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                    {segment.count}
                  </Box>
                </Typography>
              </Stack>
            )
          })}
        </Stack>
      ) : null}
    </Box>
  )
}
