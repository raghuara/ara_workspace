import { Link, Typography } from '@mui/material'
import { colors } from '@/theme/tokens'

const URL_PATTERN = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g

export const LinkifiedText = ({ text, sx }) => (
  <Typography
    variant="body2"
    component="div"
    sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.55, color: colors.textPrimary, ...sx }}
  >
    {(text ?? '').split(URL_PATTERN).map((part, index) =>
      index % 2 === 1 ? (
        <Link
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          underline="hover"
          sx={{ color: colors.brand, fontWeight: 500 }}
        >
          {part}
        </Link>
      ) : (
        part
      ),
    )}
  </Typography>
)
