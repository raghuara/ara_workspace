import { keyframes } from '@mui/material/styles'
import { colors } from '@/theme/tokens'

export const ACTIVE_VARIANT = 'solid'

const selectIn = keyframes`
  from { opacity: 0.6; transform: scale(0.97); }
  to { opacity: 1; transform: none; }
`

const easing = 'cubic-bezier(0.2, 0.8, 0.2, 1)'

const looks = {
  solid: {
    color: '#FFFFFF',
    bgcolor: colors.brand,
    boxShadow: '0 1px 2px rgba(29, 78, 216, 0.24), 0 6px 14px -4px rgba(37, 99, 235, 0.45)',
    hover: { bgcolor: colors.brandDark, color: '#FFFFFF' },
    ripple: 'rgba(255, 255, 255, 0.9)',
    bar: false,
  },
  tint: {
    color: colors.brandDark,
    bgcolor: colors.brandTint,
    boxShadow: 'none',
    hover: { bgcolor: colors.brandTintStrong, color: colors.brandDark },
    ripple: colors.brand,
    bar: true,
  },
}

export const sectionSx = { mt: 2.5 }

export const sectionLabelSx = {
  px: 2,
  mb: 0.75,
  fontSize: '0.6875rem',
  fontWeight: 600,
  lineHeight: 1.4,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  color: colors.textSecondary,
}

export const navRowSx = (active, { pl = 2, pr = 1.75, minHeight = 36 } = {}) => {
  const look = looks[ACTIVE_VARIANT]

  return {
    position: 'relative',
    borderRadius: 999,
    minHeight: { xs: minHeight + 6, lg: minHeight },
    py: 0,
    pl,
    pr,
    color: active ? look.color : colors.textSecondary,
    bgcolor: active ? look.bgcolor : 'transparent',
    boxShadow: active ? look.boxShadow : 'none',
    transition: `background-color 160ms ${easing}, color 160ms ${easing}, box-shadow 160ms ${easing}, transform 100ms ${easing}`,
    animation: active ? `${selectIn} 200ms ${easing}` : 'none',
    '& .MuiListItemIcon-root': { minWidth: 34, color: 'inherit' },
    '& .MuiListItemText-root': { my: 0 },
    '& .MuiListItemText-primary': { lineHeight: 1.3 },
    ...(look.bar && {
      '&::before': {
        content: '""',
        position: 'absolute',
        left: 0,
        top: '50%',
        width: 3,
        height: 16,
        borderRadius: 999,
        bgcolor: colors.brand,
        transform: active ? 'translateY(-50%) scaleY(1)' : 'translateY(-50%) scaleY(0)',
        transition: `transform 180ms ${easing}`,
      },
    }),
    '&:hover': active ? look.hover : { bgcolor: colors.neutralSoft, color: colors.textPrimary },
    '&:active': { transform: 'scale(0.985)' },
    '&.Mui-focusVisible': { boxShadow: `0 0 0 2px ${colors.surface}, 0 0 0 4px ${colors.brand}` },
    '& .MuiTouchRipple-child': { bgcolor: active ? look.ripple : colors.brand },
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none',
      transition: 'none',
      '&::before': { transition: 'none' },
      '&:active': { transform: 'none' },
    },
  }
}
