import { Box } from '@mui/material'
import { layout } from '@/theme/tokens'

export const PageContainer = ({ children }) => (
  <Box sx={{ maxWidth: layout.contentMaxWidth, mx: 'auto', px: { xs: 1.5, sm: 2, md: 3, lg: 4 }, py: { xs: 2, md: 3 } }}>
    {children}
  </Box>
)
