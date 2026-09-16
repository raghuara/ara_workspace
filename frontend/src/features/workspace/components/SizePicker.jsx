import { Box, Stack, Typography } from '@mui/material'
import { ToneChip } from '@/components/ToneChip'
import { TASK_SIZES, sizeByKey } from '@/constants/workspaceDomain'
import { colors } from '@/theme/tokens'

export const SizePicker = ({ value, onChange, sx }) => {
  const size = sizeByKey(value)
  return (
    <Box sx={{ border: `1px solid ${colors.border}`, borderRadius: 2, p: 2, bgcolor: colors.page, ...sx }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.25 }}>
        <Box>
          <Typography variant="subtitle2" component="p">
            Weightage
          </Typography>
          <Typography variant="caption" component="p">
            Sizing keeps five small tasks comparable against one large one.
          </Typography>
        </Box>
        <ToneChip label={`${size.points} points`} tone="teal" size="medium" />
      </Stack>

      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {TASK_SIZES.map((option) => {
          const selected = option.key === value
          return (
            <Box
              key={option.key}
              component="button"
              type="button"
              onClick={() => onChange(option.key)}
              aria-pressed={selected}
              sx={{
                flex: '1 1 120px',
                textAlign: 'left',
                cursor: 'pointer',
                borderRadius: 2,
                px: 1.25,
                py: 1,
                border: `1px solid ${selected ? colors.brand : colors.border}`,
                bgcolor: selected ? colors.brandSoft : colors.surface,
                '&:hover': { borderColor: colors.brand },
              }}
            >
              <Typography variant="body2" fontWeight={600} sx={{ color: selected ? colors.brandDark : 'inherit' }}>
                {option.key} · {option.points} pts
              </Typography>
              <Typography variant="caption" component="p">
                {option.guide}
              </Typography>
            </Box>
          )
        })}
      </Stack>
    </Box>
  )
}
