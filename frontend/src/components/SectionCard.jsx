import { Box, Card, Divider, Stack, Typography } from '@mui/material'

export const SectionCard = ({ title, description, action, disableDivider = false, padded = true, children }) => (
  <Card>
    {title || action ? (
      <>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={1.5}
          sx={{ px: 2.5, py: 2 }}
        >
          <Box>
            {title ? <Typography variant="h3">{title}</Typography> : null}
            {description ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {description}
              </Typography>
            ) : null}
          </Box>
          {action}
        </Stack>
        {disableDivider ? null : <Divider />}
      </>
    ) : null}
    <Box sx={padded ? { p: 2.5 } : undefined}>{children}</Box>
  </Card>
)
