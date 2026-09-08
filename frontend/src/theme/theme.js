import { createTheme } from '@mui/material/styles'
import { colors } from './tokens'

const fontFamily = [
  'Inter',
  '-apple-system',
  'Segoe UI',
  'Roboto',
  'Helvetica Neue',
  'Arial',
  'sans-serif',
].join(', ')

const focusRing = {
  outline: `2px solid ${colors.brand}`,
  outlineOffset: 2,
}

export const theme = createTheme({
  palette: {
    primary: { main: colors.brand, dark: colors.brandDark, light: colors.brandSoft, contrastText: '#FFFFFF' },
    success: { main: colors.success, light: colors.successSoft },
    warning: { main: colors.warning, light: colors.warningSoft },
    error: { main: colors.danger, light: colors.dangerSoft },
    background: { default: colors.page, paper: colors.surface },
    text: { primary: colors.textPrimary, secondary: colors.textSecondary },
    divider: colors.border,
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily,
    h1: { fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em' },
    h2: { fontSize: '1.375rem', fontWeight: 600, letterSpacing: '-0.015em' },
    h3: { fontSize: '1.125rem', fontWeight: 600, letterSpacing: '-0.01em' },
    h4: { fontSize: '1rem', fontWeight: 600 },
    subtitle2: { fontSize: '0.8125rem', fontWeight: 600, color: colors.textSecondary },
    body1: { fontSize: '0.9375rem' },
    body2: { fontSize: '0.875rem' },
    caption: { fontSize: '0.75rem', color: colors.textSecondary },
    button: { textTransform: 'none', fontWeight: 500 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        'a:focus-visible, button:focus-visible, [tabindex]:focus-visible': focusRing,
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { borderColor: colors.border },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0, variant: 'outlined' },
      styleOverrides: {
        root: { borderColor: colors.border, borderRadius: 10 },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8, paddingInline: 16, minHeight: 40 },
        sizeSmall: { minHeight: 34, paddingInline: 12, fontSize: '0.8125rem' },
        outlined: { borderColor: colors.border, color: colors.textPrimary,
          '&:hover': { borderColor: colors.brand, backgroundColor: colors.brandSoft } },
        text: { '&:hover': { backgroundColor: colors.brandSoft } },
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { borderRadius: 8, color: colors.textSecondary } },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: 500, fontSize: '0.75rem', height: 24 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: colors.surface,
          '& fieldset': { borderColor: colors.border },
          '&:hover fieldset': { borderColor: '#CBD5E1' },
        },
        input: { fontSize: '0.875rem' },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { fontSize: '0.875rem' } } },
    MuiFormLabel: {
      styleOverrides: { asterisk: { color: colors.danger } },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: colors.border, fontSize: '0.875rem', paddingBlock: 12 },
        head: {
          backgroundColor: colors.page,
          color: colors.textSecondary,
          fontWeight: 600,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { '&:last-child td': { borderBottom: 0 } },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 44, borderBottom: `1px solid ${colors.border}` },
        indicator: { height: 2 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 44,
          fontWeight: 500,
          fontSize: '0.875rem',
          color: colors.textSecondary,
          '&.Mui-selected': { color: colors.brand },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: colors.textPrimary, fontSize: '0.75rem', borderRadius: 6 },
      },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 12, border: `1px solid ${colors.border}` } },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { borderRadius: 8, border: `1px solid ${colors.border}`, boxShadow: '0 8px 24px rgba(15,23,42,0.08)' },
      },
    },
    MuiListItemIcon: { styleOverrides: { root: { minWidth: 34, color: 'inherit' } } },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 8, fontSize: '0.875rem' },
        standardInfo: { backgroundColor: colors.brandSoft, color: colors.textPrimary },
      },
    },
    MuiLinearProgress: { styleOverrides: { root: { borderRadius: 999, height: 6 } } },
    MuiSkeleton: { styleOverrides: { root: { backgroundColor: colors.neutralSoft } } },
  },
})
