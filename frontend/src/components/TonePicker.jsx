import { Box, Stack, Tooltip, Typography } from '@mui/material'
import { Check } from 'lucide-react'
import { STATUS_TONES, TONE_KEYS } from '@/constants/workspaceDomain'
import { ToneChip } from './ToneChip'
import { colors } from '@/theme/tokens'

const TONE_LABELS = {
  slate: 'Slate',
  blue: 'Blue',
  amber: 'Amber',
  rose: 'Rose',
  green: 'Green',
  violet: 'Violet',
  teal: 'Teal',
  gray: 'Gray', 
  orange: 'Orange',
  pink: 'Pink',
}

export const TonePicker = ({ value, onChange, label = 'Colour', previewLabel, disabled, helperText }) => {
  const current = STATUS_TONES[value] ? value : TONE_KEYS[0]

  return (
    <Box role="radiogroup" aria-label={label}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <ToneChip label={previewLabel?.trim() || TONE_LABELS[current]} tone={current} />
      </Stack>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {TONE_KEYS.map((tone) => {
          const palette = STATUS_TONES[tone]
          const selected = tone === current
          return (
            <Tooltip key={tone} title={TONE_LABELS[tone]}>
              <Box
                component="button"
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={TONE_LABELS[tone]}
                disabled={disabled}
                onClick={() => onChange(tone)}
                sx={{
                  width: 34,
                  height: 34,
                  p: 0,
                  borderRadius: '50%',
                  border: `2px solid ${selected ? palette.strong : palette.border}`,
                  bgcolor: palette.soft,
                  cursor: disabled ? 'default' : 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  transition: 'transform 120ms ease, box-shadow 120ms ease',
                  boxShadow: selected ? `0 0 0 3px ${palette.soft}, 0 0 0 4px ${palette.strong}` : 'none',
                  '&:hover': disabled ? undefined : { transform: 'scale(1.08)' },
                  '&:focus-visible': { outline: `2px solid ${colors.brand}`, outlineOffset: 2 },
                }}
              >
                <Box
                  sx={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    bgcolor: palette.strong,
                    display: 'grid',
                    placeItems: 'center',
                    color: '#FFFFFF',
                  }}
                >
                  {selected ? <Check size={12} strokeWidth={3} aria-hidden="true" /> : null}
                </Box>
              </Box>
            </Tooltip>
          )
        })}
      </Stack>
      {helperText ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
          {helperText}
        </Typography>
      ) : null}
    </Box>
  )
}
