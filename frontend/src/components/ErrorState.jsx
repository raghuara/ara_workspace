import { Box, Button, Stack, Typography } from '@mui/material'
import { RefreshCw, TriangleAlert } from 'lucide-react'
import { colors } from '@/theme/tokens'

export const ErrorState = ({
  title = 'Something went wrong',
  description = 'The request could not be completed. Please try again.',
  onRetry,
}) => (
  <Stack spacing={1.5} sx={{ alignItems: 'center', py: 7, px: 3, textAlign: 'center' }} role="alert">
    <Box
      sx={{
        width: 48,
        height: 48,
        borderRadius: 2,
        display: 'grid',
        placeItems: 'center',
        bgcolor: colors.dangerSoft,
        color: colors.danger,
      }}
    >
      <TriangleAlert size={22} strokeWidth={1.75} aria-hidden="true" />
    </Box>
    <Typography variant="h4">{title}</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
      {description}
    </Typography>
    {onRetry ? (
      <Button
        variant="outlined"
        size="small"
        onClick={onRetry}
        startIcon={<RefreshCw size={15} strokeWidth={1.75} />}
        sx={{ mt: 1 }}
      >
        Try again
      </Button>
    ) : null}
  </Stack>
)
