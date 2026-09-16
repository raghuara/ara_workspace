import { Box, Card, Divider, Stack, Typography } from '@mui/material'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { colors } from '@/theme/tokens'

export const SectionCard = ({
  title,
  description,
  action,
  accent,
  disableDivider = false,
  padded = true,
  sx,
  children,
}) => {
  const accentColor = accent ? (STATUS_TONES[accent]?.strong ?? colors.brand) : null

  return (
    <Card sx={{ display: 'flex', flexDirection: 'column', ...sx }}>
      {title || action ? (
        <>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, px: 1.75, py: 1.25 }}
          >
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
              {accentColor ? (
                <Box aria-hidden="true" sx={{ width: 3, alignSelf: 'stretch', borderRadius: 999, bgcolor: accentColor, minHeight: 28 }} />
              ) : null}
              <Box sx={{ minWidth: 0 }}>
                {title ? (
                  <Typography variant="h3" component="h2">
                    {title}
                  </Typography>
                ) : null}
                {description ? (
                  <Typography variant="caption" component="p" color="text.secondary" sx={{ mt: 0.25 }}>
                    {description}
                  </Typography>
                ) : null}
              </Box>
            </Stack>
            {action}
          </Stack>
          {disableDivider ? null : <Divider />}
        </>
      ) : null}
      <Box sx={{ flex: 1, ...(padded ? { p: 1.75 } : {}) }}>{children}</Box>
    </Card>
  )
}
