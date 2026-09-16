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
  // MUI stops at xl (1536). A 27-32" monitor sits well beyond that, so xxl gives
  // layouts somewhere to expand into instead of stranding content mid-screen.
  breakpoints: {
    values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536, xxl: 1920 },
  },
  palette: {
    primary: { main: colors.brand, dark: colors.brandDark, light: colors.brandSoft, contrastText: '#FFFFFF' },
    success: { main: colors.success, light: colors.successSoft },
    warning: { main: colors.warning, light: colors.warningSoft },
    error: { main: colors.danger, light: colors.dangerSoft },
    background: { default: colors.page, paper: colors.surface },
    text: { primary: colors.textPrimary, secondary: colors.textSecondary },
    divider: colors.border,
  },
  shape: { borderRadius: 4 },
  typography: {
    fontFamily,
    // Headings tighten their tracking as they grow, which is what stops large
    // text looking loose; body text does the opposite and stays open.
    h1: { fontSize: '1.5rem', fontWeight: 650, letterSpacing: '-0.022em', lineHeight: 1.2 },
    h2: { fontSize: '1.125rem', fontWeight: 650, letterSpacing: '-0.018em', lineHeight: 1.25 },
    h3: { fontSize: '0.9375rem', fontWeight: 650, letterSpacing: '-0.013em', lineHeight: 1.3 },
    h4: { fontSize: '0.875rem', fontWeight: 650, letterSpacing: '-0.008em', lineHeight: 1.35 },
    subtitle2: { fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.005em', color: colors.textSecondary },
    body1: { fontSize: '0.875rem', lineHeight: 1.5 },
    body2: { fontSize: '0.8125rem', lineHeight: 1.45 },
    // Held at 12px: this carries due dates and counts on cards, and 11px was
    // small enough to hurt at a glance.
    caption: { fontSize: '0.75rem', lineHeight: 1.4, letterSpacing: '0.005em', color: colors.textSecondary },
    button: { textTransform: 'none', fontWeight: 550, letterSpacing: 0 },
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
        root: { borderColor: colors.border, borderRadius: 8 },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 6, paddingInline: 14, minHeight: 36, fontSize: '0.8125rem' },
        sizeSmall: { minHeight: 30, paddingInline: 10, fontSize: '0.75rem' },
        outlined: { borderColor: colors.border, color: colors.textPrimary,
          '&:hover': { borderColor: colors.brand, backgroundColor: colors.brandSoft } },
        text: { '&:hover': { backgroundColor: colors.brandSoft } },
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { borderRadius: 6, color: colors.textSecondary } },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: 550, fontSize: '0.6875rem', height: 22 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          backgroundColor: colors.surface,
          '& fieldset': { borderColor: colors.border },
          '&:hover fieldset': { borderColor: '#CBD5E1' },
        },
        input: { fontSize: '0.8125rem' },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { fontSize: '0.8125rem' } } },
    MuiFormLabel: {
      styleOverrides: { asterisk: { color: colors.danger } },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: colors.border,
          fontSize: '0.8125rem',
          paddingBlock: 8,
          // Proportional digits make numeric columns look ragged.
          fontVariantNumeric: 'tabular-nums',
        },
        head: {
          backgroundColor: colors.page,
          color: colors.textSecondary,
          fontWeight: 600,
          fontSize: '0.6875rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          whiteSpace: 'nowrap',
          paddingBlock: 9,
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
          fontSize: '0.8125rem',
          color: colors.textSecondary,
          '&.Mui-selected': { color: colors.brand },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: colors.textPrimary, fontSize: '0.75rem', borderRadius: 6 },
        popper: { '&[data-popper-reference-hidden]': { visibility: 'hidden', pointerEvents: 'none' } },
      },
    },
    MuiDialog: {
      styleOverrides: {
        // Phones get a full-bleed sheet rather than a cramped floating card.
        paper: ({ theme }) => ({
          borderRadius: 8,
          border: `1px solid ${colors.border}`,
          [theme.breakpoints.down('sm')]: {
            margin: 0,
            width: '100%',
            maxWidth: '100%',
            height: '100%',
            maxHeight: '100%',
            borderRadius: 0,
            border: 0,
          },
        }),
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { padding: '14px 20px 10px', fontSize: '1rem', fontWeight: 650 } },
    },
    MuiDialogContent: {
      styleOverrides: { root: { padding: '16px 20px' } },
    },
    MuiDialogActions: {
      styleOverrides: { root: { padding: '12px 20px' } },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { borderRadius: 6, border: `1px solid ${colors.border}`, boxShadow: '0 8px 24px rgba(15,23,42,0.08)' },
      },
    },
    MuiListItemIcon: { styleOverrides: { root: { minWidth: 34, color: 'inherit' } } },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 6, fontSize: '0.8125rem' },
        standardInfo: { backgroundColor: colors.brandSoft, color: colors.textPrimary },
      },
    },
    MuiLinearProgress: { styleOverrides: { root: { borderRadius: 999, height: 6 } } },
    MuiSkeleton: { styleOverrides: { root: { backgroundColor: colors.neutralSoft } } },
  },
})
