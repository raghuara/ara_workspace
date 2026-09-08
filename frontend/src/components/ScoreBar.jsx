import { Box, LinearProgress, Stack, Typography } from '@mui/material'

export const ScoreBar = ({ label, score, max = 5 }) => (
  <Box>
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.75 }}>
      <Typography variant="body2">{label}</Typography>
      <Typography variant="body2" fontWeight={600}>
        {score}
        <Typography component="span" variant="caption">
          {' '}
          / {max}
        </Typography>
      </Typography>
    </Stack>
    <LinearProgress
      variant="determinate"
      value={(score / max) * 100}
      aria-label={`${label}: ${score} out of ${max}`}
    />
  </Box>
)
