import { Box, Button, Stack, Typography } from '@mui/material'
import { Inbox } from 'lucide-react'
import { colors } from '@/theme/tokens'

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'Nothing to show yet',
  description,
  actionLabel,
  onAction,
}) => (
  <Stack spacing={1.5} alignItems="center" sx={{ py: 7, px: 3, textAlign: 'center' }}>
    <Box
      sx={{
        width: 48,
        height: 48,
        borderRadius: 2,
        display: 'grid',
        placeItems: 'center',
        bgcolor: colors.neutralSoft,
        color: colors.textSecondary,
      }}
    >
      <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
    </Box>
    <Typography variant="h4">{title}</Typography>
    {description ? (
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
        {description}
      </Typography>
    ) : null}
    {actionLabel && onAction ? (
      <Button variant="outlined" size="small" onClick={onAction} sx={{ mt: 1 }}>
        {actionLabel}
      </Button>
    ) : null}
  </Stack>
)
