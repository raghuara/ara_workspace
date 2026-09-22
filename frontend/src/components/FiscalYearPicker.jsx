import { useState } from 'react'
import { Box, Divider, MenuItem, MenuList, Popover, Typography } from '@mui/material'
import { CalendarRange, Check, ChevronDown } from 'lucide-react'
import { usePeriod } from '@/hooks/usePeriod'
import { colors } from '@/theme/tokens'
import { fiscalYearLabel } from '@/utils/fiscalYear'

const shortLabel = (label) => (label.includes('-') ? `${label.slice(0, 4)}-${label.slice(7)}` : label)

export const FiscalYearPicker = () => {
  const { year, yearLabel, years, currentYear, startMonth, startMonthName, endMonthName, setYear } = usePeriod()
  const [anchor, setAnchor] = useState(null)
  const open = Boolean(anchor)

  return (
    <>
      <Box
        component="button"
        type="button"
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Financial year ${yearLabel}. Change year`}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: { xs: 0.625, sm: 0.875 },
          flexShrink: 0,
          height: 36,
          px: { xs: 1, sm: 1.375 },
          border: `1px solid ${open ? colors.brand : colors.border}`,
          borderRadius: 2,
          bgcolor: open ? colors.brandSoft : colors.page,
          color: colors.textPrimary,
          cursor: 'pointer',
          font: 'inherit',
          fontSize: '0.8125rem',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          transition: 'background-color 140ms ease, border-color 140ms ease, transform 120ms ease',
          '&:hover': { bgcolor: open ? colors.brandSoft : colors.neutralSoft },
          '&:active': { transform: 'scale(0.985)' },
          '&:focus-visible': { outline: 'none', boxShadow: `0 0 0 2px ${colors.surface}, 0 0 0 4px ${colors.brand}` },
        }}
      >
        <CalendarRange
          size={15}
          strokeWidth={1.75}
          color={year === currentYear ? colors.brand : colors.textSecondary}
          aria-hidden="true"
        />
        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
          {yearLabel}
        </Box>
        <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
          {shortLabel(yearLabel)}
        </Box>
        <Box
          sx={{
            display: 'inline-flex',
            color: colors.textSecondary,
            transition: 'transform 160ms ease',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        >
          <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
        </Box>
      </Box>

      <Popover
        open={open}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              width: 240,
              maxWidth: 'calc(100vw - 24px)',
              mt: 1,
              py: 0.75,
              borderRadius: 2.5,
              boxShadow: '0 16px 40px rgba(15, 23, 42, 0.14), 0 2px 6px rgba(15, 23, 42, 0.06)',
            },
          },
        }}
      >
        <Typography
          component="p"
          sx={{
            px: 2,
            pt: 0.75,
            pb: 0.5,
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: colors.textSecondary,
          }}
        >
          Financial year
        </Typography>

        <MenuList autoFocusItem={open} aria-label="Financial years" sx={{ py: 0 }}>
          {years.map((option) => {
            const selected = option === year
            return (
              <MenuItem
                key={option}
                selected={selected}
                onClick={() => {
                  setYear(option)
                  setAnchor(null)
                }}
                sx={{
                  mx: 0.75,
                  my: 0.125,
                  px: 1.25,
                  py: 0.75,
                  borderRadius: 1.5,
                  gap: 1,
                  '&.Mui-selected': { bgcolor: colors.brandSoft, '&:hover': { bgcolor: colors.brandTint } },
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ flex: 1, fontWeight: selected ? 700 : 500, fontVariantNumeric: 'tabular-nums' }}
                >
                  {fiscalYearLabel(option, startMonth)}
                </Typography>
                {option === currentYear ? (
                  <Typography variant="caption" sx={{ color: colors.brand, fontWeight: 600 }}>
                    Current
                  </Typography>
                ) : null}
                {selected ? <Check size={15} strokeWidth={2.25} color={colors.brand} aria-hidden="true" /> : null}
              </MenuItem>
            )
          })}
        </MenuList>

        <Divider sx={{ my: 0.75 }} />
        <Typography variant="caption" component="p" sx={{ px: 2, pb: 0.5 }}>
          Runs {startMonthName} – {endMonthName}
        </Typography>
      </Popover>
    </>
  )
}
