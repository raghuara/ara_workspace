import { Box, Breadcrumbs, Link as MuiLink, Stack, Typography } from '@mui/material'
import { ChevronRight } from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'

export const PageHeader = ({ title, description, breadcrumbs = [], actions }) => (
  <Box component="header" sx={{ mb: 3 }}>
    {breadcrumbs.length > 0 ? (
      <Breadcrumbs
        separator={<ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />}
        sx={{ mb: 1, '& .MuiBreadcrumbs-separator': { mx: 0.75, color: 'text.secondary' } }}
      >
        {breadcrumbs.map((crumb, index) =>
          crumb.to && index < breadcrumbs.length - 1 ? (
            <MuiLink
              key={crumb.label}
              component={RouterLink}
              to={crumb.to}
              underline="hover"
              variant="body2"
              color="text.secondary"
            >
              {crumb.label}
            </MuiLink>
          ) : (
            <Typography key={crumb.label} variant="body2" color="text.primary" fontWeight={500}>
              {crumb.label}
            </Typography>
          ),
        )}
      </Breadcrumbs>
    ) : null}

    <Stack
      direction={{ xs: 'column', md: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', md: 'center' }}
      spacing={2}
    >
      <Box>
        <Typography variant="h1" component="h1">
          {title}
        </Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 640 }}>
            {description}
          </Typography>
        ) : null}
      </Box>
      {actions ? (
        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          {actions}
        </Stack>
      ) : null}
    </Stack>
  </Box>
)
