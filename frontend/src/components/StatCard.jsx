import { Box, Card, Skeleton, Stack, Typography } from '@mui/material'
import { colors } from '@/theme/tokens'

export const StatCard = ({ label, value, helperText, icon: Icon, loading = false }) => (
  <Card sx={{ p: 2.5, height: '100%' }}>
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" component="p">
          {label}
        </Typography>
        {loading ? (
          <Skeleton variant="text" width={72} height={40} sx={{ mt: 0.5 }} />
        ) : (
          <Typography variant="h1" component="p" sx={{ mt: 0.5, fontSize: '1.875rem' }}>
            {value}
          </Typography>
        )}
        {helperText && !loading ? (
          <Typography variant="caption" component="p" sx={{ mt: 0.5 }}>
            {helperText}
          </Typography>
        ) : null}
      </Box>
      {Icon ? (
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            bgcolor: colors.brandSoft,
            color: colors.brand,
          }}
        >
          <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
        </Box>
      ) : null}
    </Stack>
  </Card>
)
