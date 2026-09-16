import { Box, Stack, Typography } from '@mui/material'
import { TriangleAlert } from 'lucide-react'
import { STATUS_TONES } from '@/constants/workspaceDomain'

/** Small tinted number tile for dense grids inside cards and drawers. */
export const MetricTile = ({ label, value, hint, tone = 'slate', warn = false }) => {
  const palette = STATUS_TONES[tone] ?? STATUS_TONES.slate
  return (
    <Box sx={{ px: 1.125, py: 0.875, borderRadius: 2, bgcolor: palette.soft, border: `1px solid ${palette.border}`, minWidth: 0 }}>
      <Typography
        component="p"
        noWrap
        sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: palette.strong }}
      >
        {label}
      </Typography>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </Typography>
        {warn && Number(value) > 0 ? (
          <TriangleAlert size={13} strokeWidth={2} color={STATUS_TONES.rose.strong} aria-label="Needs attention" />
        ) : null}
      </Stack>
      {hint ? (
        <Typography variant="caption" component="p" noWrap>
          {hint}
        </Typography>
      ) : null}
    </Box>
  )
}
