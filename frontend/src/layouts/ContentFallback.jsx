import { Box, Skeleton, Stack } from '@mui/material'
import { layout } from '@/theme/tokens'

export const ContentFallback = () => (
  <Box
    aria-busy="true"
    aria-label="Loading page"
    sx={{ maxWidth: layout.contentMaxWidth, mx: 'auto', px: { xs: 1.5, sm: 2, md: 3, lg: 4 }, py: { xs: 2, md: 3 } }}
  >
    <Skeleton variant="text" width={180} height={18} />
    <Skeleton variant="text" width={280} height={40} />
    <Skeleton variant="text" width={360} height={20} sx={{ mb: 2.5 }} />
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
        mb: 2,
      }}
    >
      {[0, 1, 2, 3].map((key) => (
        <Skeleton key={key} variant="rounded" height={96} sx={{ borderRadius: 2.5 }} />
      ))}
    </Box>
    <Stack spacing={1.5}>
      <Skeleton variant="rounded" height={220} sx={{ borderRadius: 2.5 }} />
      <Skeleton variant="rounded" height={160} sx={{ borderRadius: 2.5 }} />
    </Stack>
  </Box>
)
