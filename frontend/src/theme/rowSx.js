import { colors } from './tokens'

export const ROW_ACTION_CLASS = 'row-action'

export const listRowSx = {
  borderBottom: `1px solid ${colors.border}`,
  '&:last-of-type': { borderBottom: 0 },
  transition: 'background-color 120ms ease',
  '&:hover': { bgcolor: colors.brandSoft },
  [`&:hover .${ROW_ACTION_CLASS}`]: {
    borderColor: colors.brand,
    color: colors.brand,
    bgcolor: colors.surface,
  },
}
