import { useState } from 'react'
import { Alert, Box, Divider, Stack, Switch, Tooltip, Typography } from '@mui/material'
import { Lock, Zap } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SectionCard } from '@/components/SectionCard'
import { QueryStateView } from '@/components/QueryStateView'
import { adminService } from '@/api/adminService'
import { FEATURE_CATALOG } from '@/constants/features'
import { PERMISSIONS } from '@/constants/permissions'
import { useAsync } from '@/hooks/useAsync'
import { usePermissions } from '@/hooks/usePermissions'
import { useSession } from '@/hooks/useSession'
import { colors } from '@/theme/tokens'

const ToggleRow = ({ title, description, checked, disabled, lockedReason, onChange }) => (
  <Stack
    direction="row"
    spacing={2}
    sx={{ alignItems: 'flex-start', py: 1.5, borderBottom: `1px solid ${colors.border}`, '&:last-of-type': { borderBottom: 0 } }}
  >
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
        <Typography variant="body2" fontWeight={600}>
          {title}
        </Typography>
        {lockedReason ? (
          <Tooltip title={lockedReason}>
            <Box sx={{ display: 'inline-flex', color: colors.textSecondary }}>
              <Lock size={12} strokeWidth={1.75} aria-label={lockedReason} />
            </Box>
          </Tooltip>
        ) : null}
      </Stack>
      <Typography variant="caption" component="p" sx={{ mt: 0.25 }}>
        {description}
      </Typography>
    </Box>
    <Switch
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
      slotProps={{ input: { 'aria-label': `${title} enabled` } }}
    />
  </Stack>
)

export const FeatureAccessPage = () => {
  const { refreshSession } = useSession()
  const { can } = usePermissions()

  const features = useAsync(adminService.getFeatureAccess, [])
  const automations = useAsync(adminService.getAutomations, [])
  const [error, setError] = useState('')

  const setFeature = async (key, enabled) => {
    setError('')
    try {
      await adminService.setFeature(key, enabled)
      await features.reload()
      await refreshSession()
    } catch (caught) {
      setError(caught.message ?? 'That feature could not be changed.')
    }
  }

  const setAutomation = async (id, enabled) => {
    setError('')
    try {
      await adminService.setAutomation(id, enabled)
      await automations.reload()
    } catch (caught) {
      setError(caught.message ?? 'That automation could not be changed.')
    }
  }

  return (
    <Box sx={{ maxWidth: 940, mx: 'auto', px: { xs: 2, md: 3, lg: 4 }, py: { xs: 3, md: 4 } }}>
      <PageHeader
        title="Feature Access"
        description="Switch modules on and off for the whole organisation. Turning one off hides its navigation and blocks its routes — nothing is deleted."
        breadcrumbs={[{ label: 'Administration' }, { label: 'Feature Access' }]}
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      ) : null}

      <QueryStateView error={features.error} onRetry={features.reload}>
        <Stack spacing={2}>
          {FEATURE_CATALOG.map((group) => (
            <SectionCard key={group.key} title={group.label}>
              {group.features.map((feature) => (
                <ToggleRow
                  key={feature.key}
                  title={feature.name}
                  description={feature.description}
                  checked={features.data?.[feature.key] !== false}
                  disabled={feature.locked}
                  lockedReason={feature.locked ? 'Required — this feature cannot be turned off.' : ''}
                  onChange={(enabled) => setFeature(feature.key, enabled)}
                />
              ))}
            </SectionCard>
          ))}

          {can(PERMISSIONS.AUTOMATION_MANAGE) ? (
            <SectionCard
              title="Automations"
              description="Rules the board applies on its own"
              action={
                <Box sx={{ display: 'inline-flex', color: colors.brand }}>
                  <Zap size={18} strokeWidth={1.75} aria-hidden="true" />
                </Box>
              }
            >
              <QueryStateView error={automations.error} onRetry={automations.reload}>
                {(automations.data ?? []).map((rule) => (
                  <ToggleRow
                    key={rule.id}
                    title={rule.name}
                    description={rule.description}
                    checked={rule.enabled}
                    onChange={(enabled) => setAutomation(rule.id, enabled)}
                  />
                ))}
              </QueryStateView>
            </SectionCard>
          ) : null}

          <Divider />
          <Typography variant="caption" component="p">
            Feature access is a product switch, not a security boundary. The Node backend must reject requests
            for a disabled module independently — a client with a stale flag would otherwise still reach it.
          </Typography>
        </Stack>
      </QueryStateView>
    </Box>
  )
}
