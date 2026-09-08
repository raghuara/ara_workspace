import { Box, Button, Card, Stack, Typography } from '@mui/material'
import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { colors } from '@/theme/tokens'

export const AccessRestricted = ({
  title = 'Access restricted',
  description = 'You do not have permission to view this information. Contact your HR administrator if you believe this is a mistake.',
  showBackAction = true,
}) => {
  const navigate = useNavigate()

  return (
    <Card sx={{ p: { xs: 3, md: 6 } }}>
      <Stack spacing={2} alignItems="center" sx={{ textAlign: 'center' }} role="alert">
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: colors.warningSoft,
            color: colors.warning,
          }}
        >
          <ShieldAlert size={24} strokeWidth={1.75} aria-hidden="true" />
        </Box>
        <Typography variant="h2">{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460 }}>
          {description}
        </Typography>
        {showBackAction ? (
          <Button
            variant="outlined"
            onClick={() => navigate(-1)}
            startIcon={<ArrowLeft size={16} strokeWidth={1.75} />}
            sx={{ mt: 1 }}
          >
            Go back
          </Button>
        ) : null}
      </Stack>
    </Card>
  )
}
