import { Box, Typography } from '@mui/material'

export const DefinitionList = ({ items, columns = { xs: 1, sm: 2, lg: 3 } }) => (
  <Box
    component="dl"
    sx={{
      m: 0,
      display: 'grid',
      gap: 2,
      gridTemplateColumns: {
        xs: `repeat(${columns.xs ?? 1}, minmax(0, 1fr))`,
        sm: `repeat(${columns.sm ?? 2}, minmax(0, 1fr))`,
        lg: `repeat(${columns.lg ?? 3}, minmax(0, 1fr))`,
      },
    }}
  >
    {items.map((item) => (
      <Box key={item.label} sx={{ minWidth: 0 }}>
        <Typography component="dt" variant="subtitle2">
          {item.label}
        </Typography>
        <Typography component="dd" variant="body2" sx={{ m: 0, mt: 0.5, wordBreak: 'break-word' }}>
          {item.value === '' || item.value === null || item.value === undefined ? '—' : item.value}
        </Typography>
      </Box>
    ))}
  </Box>
)
