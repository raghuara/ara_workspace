import { Box } from '@mui/material'
import { EmptyState } from '@/components/EmptyState'
import { PageContainer } from '@/components/PageContainer'
import { PageHeader } from '@/components/PageHeader'
import { ALL_FEATURES } from '@/constants/features'
import { useFeatures } from '@/hooks/useFeatures'

/**
 * Blocks a route whose feature has been switched off. This is a product switch,
 * not a security control — the backend must refuse the same requests itself.
 */
export const RequireFeature = ({ feature, children }) => {
  const { isEnabled } = useFeatures()
  if (isEnabled(feature)) return <>{children}</>

  const definition = ALL_FEATURES.find((item) => item.key === feature)

  return (
    <PageContainer>
      <Box>
        <PageHeader title={definition?.name ?? 'Module unavailable'} />
        <EmptyState
          title={`${definition?.name ?? 'This module'} is turned off`}
          description="An administrator has disabled this module for your organisation. It can be switched back on under Administration → Feature Access."
        />
      </Box>
    </PageContainer>
  )
}
