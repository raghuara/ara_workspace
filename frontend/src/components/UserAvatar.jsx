import { Avatar } from '@mui/material'
import { getInitials } from '@/utils/format'
import { colors } from '@/theme/tokens'

const PALETTE = ['#2563EB', '#0F766E', '#7C3AED', '#B45309', '#BE123C', '#0369A1']

const hashIndex = (value, length) => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 100000
  }
  return hash % length
}

export const UserAvatar = ({ name, src, size = 36 }) => (
  <Avatar
    src={src ?? undefined}
    alt={name ? `${name} avatar` : 'Avatar'}
    sx={{
      width: size,
      height: size,
      fontSize: size * 0.36,
      fontWeight: 600,
      bgcolor: src ? undefined : `${PALETTE[hashIndex(name ?? '?', PALETTE.length)]}14`,
      color: src ? undefined : PALETTE[hashIndex(name ?? '?', PALETTE.length)],
      border: `1px solid ${colors.border}`,
    }}
  >
    {getInitials(name)}
  </Avatar>
)
