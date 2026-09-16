import { Box, Breadcrumbs, Link as MuiLink, Stack, Typography } from '@mui/material'
import { ChevronRight } from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'

/**
 * Deliberately compact: on board-style screens the header competes with the
 * content for vertical space, so the title block stays tight and actions sit on
 * the same row, pushed to the right edge.
 */
export const PageHeader = ({ title, description, breadcrumbs = [], actions }) => (
  <Box component="header" sx={{ mb: 2 }}>
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      sx={{
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {breadcrumbs.length > 0 ? (
          <Breadcrumbs
            separator={<ChevronRight size={12} strokeWidth={1.75} aria-hidden="true" />}
            sx={{
              mb: 0.25,
              '& .MuiBreadcrumbs-separator': { mx: 0.5, color: 'text.secondary' },
              '& .MuiBreadcrumbs-li': { lineHeight: 1.4 },
            }}
          >
            {breadcrumbs.map((crumb, index) =>
              crumb.to && index < breadcrumbs.length - 1 ? (
                <MuiLink
                  key={crumb.label}
                  component={RouterLink}
                  to={crumb.to}
                  underline="hover"
                  variant="caption"
                  color="text.secondary"
                >
                  {crumb.label}
                </MuiLink>
              ) : (
                <Typography key={crumb.label} variant="caption" color="text.secondary" fontWeight={500}>
                  {crumb.label}
                </Typography>
              ),
            )}
          </Breadcrumbs>
        ) : null}

        <Typography
          variant="h1"
          component="h1"
          sx={{
            fontSize: { xs: '1.0625rem', sm: '1.125rem', md: '1.25rem' },
            lineHeight: 1.25,
            // Truncating is fine where there is room to spare; on a phone the
            // title is the only wayfinding, so let it wrap instead.
            whiteSpace: { xs: 'normal', md: 'nowrap' },
            overflow: { md: 'hidden' },
            textOverflow: { md: 'ellipsis' },
          }}
        >
          {title}
        </Typography>

        {description ? (
          <Typography
            variant="caption"
            component="p"
            color="text.secondary"
            sx={{ mt: 0.25, maxWidth: 720, display: { xs: 'none', md: 'block' } }}
          >
            {description}
          </Typography>
        ) : null}
      </Box>

      {actions ? (
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0, flexWrap: 'wrap' }}>
          {actions}
        </Stack>
      ) : null}
    </Stack>
  </Box>
)
