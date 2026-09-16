import { Alert, AlertTitle } from '@mui/material'
import { Lock } from 'lucide-react'
import { colors } from '@/theme/tokens'

export const RestrictedBanner = () => (
  <Alert
    icon={<Lock size={18} strokeWidth={1.75} />}
    severity="info"
    sx={{
      mb: 2,
      bgcolor: colors.brandSoft,
      color: colors.textPrimary,
      border: `1px solid ${colors.border}`,
      '& .MuiAlert-icon': { color: colors.brand },
    }}
  >
    <AlertTitle sx={{ fontWeight: 600, fontSize: '0.8125rem', mb: 0.25 }}>
      Confidential — Compensation
    </AlertTitle>
    Salary information is restricted to authorised roles and is never shown in employee, recruitment
    or performance screens.
  </Alert>
)
