import { Button, Card, Stack, Typography } from '@mui/material'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'

export const NotFoundPage = () => (
  <Card sx={{ p: { xs: 3, md: 6 } }}>
    <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
      <Typography variant="h1" component="p" sx={{ fontSize: '2.5rem' }}>
        404
      </Typography>
      <Typography variant="h2" component="h1">
        Page not found
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
        The page you are looking for does not exist or may have been moved.
      </Typography>
      <Button
        component={Link}
        to={ROUTES.dashboard}
        variant="contained"
        startIcon={<ArrowLeft size={16} strokeWidth={1.75} />}
        sx={{ mt: 1 }}
      >
        Back to dashboard
      </Button>
    </Stack>
  </Card>
)
