import { Box, Stack, Typography } from '@mui/material'
import { ChevronRight } from 'lucide-react'
import { UserAvatar } from '@/components/UserAvatar'
import { colors } from '@/theme/tokens'
import { fillFor, washFor } from './chartColors'

const RankBadge = ({ rank, tone }) => (
  <Box
    aria-hidden="true"
    sx={{
      width: 22,
      height: 22,
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
      flexShrink: 0,
      fontSize: '0.6875rem',
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
      bgcolor: rank === 1 ? fillFor(tone) : colors.neutralSoft,
      color: rank === 1 ? '#FFFFFF' : colors.textSecondary,
    }}
  >
    {rank}
  </Box>
)

export const RankedBars = ({ rows, ariaLabel }) => {
  const max = Math.max(1, ...rows.map((row) => row.value))

  return (
    <Stack component="ol" spacing={0.5} aria-label={ariaLabel} sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {rows.map((row, index) => {
        const clickable = Boolean(row.onClick)
        return (
          <Box component="li" key={row.key}>
            <Box
              component={clickable ? 'button' : 'div'}
              type={clickable ? 'button' : undefined}
              onClick={row.onClick}
              aria-label={clickable ? `${row.label}: ${row.valueText}. Show details` : undefined}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '22px minmax(0, 1fr) auto', sm: '22px minmax(140px, 220px) minmax(0, 1fr) 20px' },
                columnGap: 1.25,
                rowGap: 0.75,
                alignItems: 'center',
                width: '100%',
                px: 1,
                py: 0.875,
                border: 0,
                borderRadius: 1.5,
                bgcolor: 'transparent',
                font: 'inherit',
                color: 'inherit',
                textAlign: 'left',
                cursor: clickable ? 'pointer' : 'default',
                transition: 'background-color 120ms ease',
                '&:hover': clickable ? { bgcolor: washFor(row.tone) } : {},
                '&:hover .ranked-chevron': clickable ? { color: fillFor(row.tone), transform: 'translateX(2px)' } : {},
                '&:focus-visible': { outline: 'none', boxShadow: `inset 0 0 0 2px ${colors.brand}` },
              }}
            >
              <RankBadge rank={index + 1} tone={row.tone} />
  
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                {row.avatarName ? <UserAvatar name={row.avatarName} size={28} /> : null}
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {row.label}
                  </Typography>
                  {row.sublabel ? (
                    <Typography variant="caption" component="p" noWrap>
                      {row.sublabel}
                    </Typography>
                  ) : null}
                </Box>
              </Stack>
  
              <Box
                sx={{
                  gridColumn: { xs: '2 / 4', sm: 'auto' },
                  gridRow: { xs: 2, sm: 'auto' },
                  minWidth: 0,
                }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Box sx={{ flex: 1, height: 10, borderRadius: 999, bgcolor: washFor(row.tone), overflow: 'hidden' }}>
                    <Box
                      sx={{
                        width: `${(row.value / max) * 100}%`,
                        minWidth: row.value > 0 ? 6 : 0,
                        height: '100%',
                        borderRadius: 999,
                        bgcolor: fillFor(row.tone),
                        transition: 'width 320ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                      }}
                    />
                  </Box>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    sx={{ minWidth: 56, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {row.valueText}
                  </Typography>
                </Stack>
                {row.detail ? (
                  <Typography variant="caption" component="p" noWrap sx={{ mt: 0.25 }}>
                    {row.detail}
                  </Typography>
                ) : null}
              </Box>
  
              <Box
                className="ranked-chevron"
                aria-hidden="true"
                sx={{
                  display: 'inline-flex',
                  justifySelf: 'end',
                  color: clickable ? colors.textSecondary : 'transparent',
                  transition: 'transform 120ms ease, color 120ms ease',
                }}
              >
                <ChevronRight size={16} strokeWidth={2} />
              </Box>
            </Box>
          </Box>
        )
      })}
    </Stack>
  )
}
