import { Box, Skeleton, Stack, Typography } from '@mui/material'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { colors } from '@/theme/tokens'

/**
 * Summary tile. The surface stays white so a row of six reads as one family;
 * the tone lives in the label, the icon badge and the optional meter, and the
 * value only takes the tone when `emphasis` marks it as something to act on.
 */
export const StatCard = ({
  label,
  value,
  helperText,
  icon: Icon,
  tone = 'blue',
  loading = false,
  dense = false,
  progress,
  emphasis = false,
}) => {
  const palette = STATUS_TONES[tone] ?? STATUS_TONES.blue
  const badge = dense ? 30 : 34
  const hasMeter = typeof progress === 'number' && !loading

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: dense ? { xs: 1.25, md: 1.5 } : { xs: 1.5, md: 1.75 },
        borderRadius: 2.5,
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${palette.soft} 0%, ${palette.tint} 100%)`,
        border: `1px solid ${palette.border}`,
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
        transition: 'transform 140ms ease, box-shadow 140ms ease',
        '&:hover': { transform: 'translateY(-1px)', boxShadow: `0 6px 16px -8px ${palette.strong}55` },
        '&::after': {
          content: '""',
          position: 'absolute',
          right: -28,
          bottom: -34,
          width: 96,
          height: 96,
          borderRadius: '50%',
          bgcolor: palette.strong,
          opacity: 0.06,
          pointerEvents: 'none',
        },
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: 'flex-start', flex: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="p"
            noWrap
            sx={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: palette.strong,
              lineHeight: 1.4,
            }}
          >
            {label}
          </Typography>

          {loading ? (
            <Skeleton variant="text" width={64} height={36} sx={{ mt: 0.25 }} />
          ) : (
            <Typography
              component="p"
              sx={{
                mt: 0.5,
                fontSize: dense ? { xs: '1.25rem', md: '1.375rem' } : { xs: '1.375rem', md: '1.5rem' },
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                color: emphasis ? palette.strong : colors.textPrimary,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {value}
            </Typography>
          )}

          {helperText && !loading ? (
            <Typography variant="caption" component="p" noWrap sx={{ mt: dense ? 0.5 : 0.75, color: colors.textSecondary }}>
              {helperText}
            </Typography>
          ) : null}
        </Box>

        {Icon ? (
          <Box
            aria-hidden="true"
            sx={{
              width: badge,
              height: badge,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              bgcolor: colors.surface,
              color: palette.strong,
              border: `1px solid ${palette.border}`,
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
            }}
          >
            <Icon size={dense ? 16 : 18} strokeWidth={1.75} />
          </Box>
        ) : null}
      </Stack>

      {hasMeter ? (
        <Box
          role="progressbar"
          aria-label={`${label} progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          sx={{ mt: dense ? 1.125 : 1.375, height: 4, borderRadius: 999, bgcolor: `${palette.strong}22`, overflow: 'hidden' }}
        >
          <Box
            sx={{
              width: `${Math.min(100, Math.max(0, progress))}%`,
              height: '100%',
              borderRadius: 999,
              bgcolor: palette.strong,
              transition: 'width 420ms cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          />
        </Box>
      ) : null}
    </Box>
  )
}
