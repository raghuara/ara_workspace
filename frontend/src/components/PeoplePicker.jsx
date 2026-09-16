import { Autocomplete, Box, Checkbox, Chip, TextField, Typography } from '@mui/material'
import { Check, Search } from 'lucide-react'
import { UserAvatar } from './UserAvatar'
import { colors } from '@/theme/tokens'

const matches = (option, needle) =>
  [option.fullName, option.employeeId, option.department, option.designation]
    .filter(Boolean)
    .some((text) => text.toLowerCase().includes(needle))

export const PeoplePicker = ({
  options = [],
  value,
  onChange,
  multiple = false,
  label,
  placeholder = 'Search by name, ID or department…',
  helperText,
  error,
  required,
  disabled,
  autoFocus,
}) => {
  const byId = new Map(options.map((option) => [option.id, option]))
  const selected = multiple
    ? (value ?? []).map((id) => byId.get(id)).filter(Boolean)
    : (value && byId.get(value)) || null

  return (
    <Autocomplete
      multiple={multiple}
      disableCloseOnSelect={multiple}
      options={options}
      value={selected}
      disabled={disabled}
      onChange={(_, next) => onChange(multiple ? next.map((option) => option.id) : (next?.id ?? ''))}
      getOptionLabel={(option) => option.fullName}
      isOptionEqualToValue={(option, candidate) => option.id === candidate.id}
      filterOptions={(candidates, state) => {
        const needle = state.inputValue.trim().toLowerCase()
        return needle ? candidates.filter((option) => matches(option, needle)) : candidates
      }}
      noOptionsText="No one matches"
      slotProps={{ paper: { sx: { boxShadow: '0 12px 32px rgba(15, 23, 42, 0.14)' } } }}
      renderOption={(props, option, { selected: isSelected }) => {
        const { key, ...rest } = props
        return (
          <Box component="li" key={key} {...rest} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 0.75 }}>
            {multiple ? <Checkbox size="small" checked={isSelected} tabIndex={-1} sx={{ p: 0.25, ml: -0.5 }} /> : null}
            <UserAvatar name={option.fullName} size={30} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" fontWeight={600} noWrap>
                {option.fullName}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                {[option.employeeId, option.department, option.designation].filter(Boolean).join(' · ')}
              </Typography>
            </Box>
            {!multiple && isSelected ? (
              <Check size={16} strokeWidth={2} color={colors.brand} aria-hidden="true" />
            ) : null}
          </Box>
        )
      }}
      renderValue={
        multiple
          ? (tagValue, getItemProps) =>
              tagValue.map((option, index) => {
                const { key, ...itemProps } = getItemProps({ index })
                return (
                  <Chip
                    key={key}
                    {...itemProps}
                    size="small"
                    avatar={<UserAvatar name={option.fullName} size={20} />}
                    label={option.fullName}
                    sx={{ fontWeight: 500, '& .MuiChip-avatar': { width: 20, height: 20, fontSize: 9 } }}
                  />
                )
              })
          : undefined
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={selected && (!multiple || selected.length > 0) ? '' : placeholder}
          size="small"
          required={required}
          error={Boolean(error)}
          autoFocus={autoFocus}
          helperText={error ?? helperText ?? (multiple ? `${selected.length} selected` : ' ')}
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps.input,
              startAdornment: (
                <>
                  {!multiple && selected ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.5, mr: 0.5 }}>
                      <UserAvatar name={selected.fullName} size={22} />
                    </Box>
                  ) : multiple && selected.length === 0 ? (
                    <Search
                      size={15}
                      strokeWidth={1.75}
                      color={colors.textSecondary}
                      style={{ marginLeft: 6, marginRight: 4 }}
                      aria-hidden="true"
                    />
                  ) : null}
                  {params.slotProps.input.startAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  )
}
