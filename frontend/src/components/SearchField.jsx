import { IconButton, InputAdornment, TextField } from '@mui/material'
import { Search, X } from 'lucide-react'
import { colors } from '@/theme/tokens'

export const SearchField = ({ value, onChange, placeholder = 'Search…', label, fullWidth = false, sx }) => (
  <TextField
    size="small"
    value={value}
    onChange={(event) => onChange(event.target.value)}
    placeholder={placeholder}
    fullWidth={fullWidth}
    slotProps={{
      htmlInput: { 'aria-label': label ?? placeholder },
      input: {
        startAdornment: (
          <InputAdornment position="start">
            <Search size={16} strokeWidth={1.75} color={colors.textSecondary} aria-hidden="true" />
          </InputAdornment>
        ),
        endAdornment: value ? (
          <InputAdornment position="end">
            <IconButton size="small" aria-label="Clear search" onClick={() => onChange('')}>
              <X size={14} strokeWidth={1.75} />
            </IconButton>
          </InputAdornment>
        ) : null,
      },
    }}
    sx={{ minWidth: { sm: 260 }, ...sx }}
  />
)
