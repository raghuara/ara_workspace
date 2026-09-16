import { useState } from 'react'
import { Badge, Box, Button, Collapse, Divider, MenuItem, Stack, Tab, Tabs, TextField } from '@mui/material'
import { RotateCcw, SlidersHorizontal } from 'lucide-react'
import { SearchField } from '@/components/SearchField'
import { PRIORITIES, TASK_SIZES, TASK_TABS } from '@/constants/workspaceDomain'
import { FEATURES } from '@/constants/features'
import { useFeatures } from '@/hooks/useFeatures'
import { useWorkspace } from '@/hooks/useWorkspace'
import { colors } from '@/theme/tokens'

const compactSelect = { minWidth: 140, '& .MuiInputBase-root': { bgcolor: colors.surface } }

/**
 * The six selects cost a whole row that is rarely in use, so they collapse
 * behind a toggle. Timeframe tabs and search stay visible because they are the
 * ones people reach for constantly.
 */
export const TaskFilterBar = ({ filters, onChange, onReset, hideGroup, hideTeam, teamScopeGroupId }) => {
  const { groups, teams, clients, assignableMembers } = useWorkspace()
  const { isEnabled } = useFeatures()

  const set = (field) => (event) => onChange({ ...filters, [field]: event.target.value })

  const scopeGroupId = teamScopeGroupId || filters.groupId
  const teamOptions = scopeGroupId ? teams.filter((team) => team.groupId === scopeGroupId) : teams

  // Only count filters actually reachable on this screen — a route-scoped group
  // is not something the person can clear from here.
  const activeCount = [
    filters.clientId,
    hideGroup ? '' : filters.groupId,
    hideTeam ? '' : filters.teamId,
    filters.assigneeId,
    filters.priority,
    filters.sizeKey,
  ].filter(Boolean).length

  const [open, setOpen] = useState(activeCount > 0)
  const hasAnything = activeCount > 0 || Boolean(filters.search)

  return (
    <Box sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 2.5, mb: 2 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1}
        sx={{ alignItems: { xs: 'stretch', md: 'center' }, px: 1.5, py: 0.75 }}
      >
        <Tabs
          value={filters.tab}
          onChange={(_, value) => onChange({ ...filters, tab: value })}
          aria-label="Task timeframe"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ minHeight: 36, borderBottom: 'none', '& .MuiTab-root': { minHeight: 36, py: 0 } }}
        >
          {TASK_TABS.map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} />
          ))}
        </Tabs>

        <Box sx={{ flex: 1 }} />

        <SearchField
          value={filters.search}
          onChange={(value) => onChange({ ...filters, search: value })}
          label="Search tasks"
          placeholder="Search tasks…"
          sx={{ minWidth: { md: 220 } }}
        />

        <Button
          size="small"
          variant={open ? 'contained' : 'outlined'}
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          startIcon={<SlidersHorizontal size={14} strokeWidth={1.75} />}
          sx={{ flexShrink: 0 }}
        >
          <Badge
            badgeContent={activeCount}
            color={open ? 'default' : 'primary'}
            sx={{ '& .MuiBadge-badge': { right: -14, top: 2 } }}
          >
            Filters
          </Badge>
        </Button>

        {hasAnything ? (
          <Button
            size="small"
            variant="text"
            onClick={onReset}
            startIcon={<RotateCcw size={14} strokeWidth={1.75} />}
            sx={{ flexShrink: 0 }}
          >
            Reset
          </Button>
        ) : null}
      </Stack>

      <Collapse in={open} timeout={140} unmountOnExit>
        <Divider />
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ flexWrap: 'wrap', alignItems: 'center', px: 1.5, py: 1.25 }}
        >
          <TextField select size="small" label="Client" value={filters.clientId} onChange={set('clientId')} sx={compactSelect}>
            <MenuItem value="">All clients</MenuItem>
            {clients.map((client) => (
              <MenuItem key={client.id} value={client.id}>
                {client.name}
              </MenuItem>
            ))}
          </TextField>

          {hideGroup ? null : (
            <TextField
              select
              size="small"
              label="Group"
              value={filters.groupId}
              onChange={(event) => onChange({ ...filters, groupId: event.target.value, teamId: '' })}
              sx={compactSelect}
            >
              <MenuItem value="">All groups</MenuItem>
              {groups.map((group) => (
                <MenuItem key={group.id} value={group.id}>
                  {group.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          {hideTeam ? null : (
            <TextField select size="small" label="Team" value={filters.teamId} onChange={set('teamId')} sx={compactSelect}>
              <MenuItem value="">All teams</MenuItem>
              {teamOptions.map((team) => (
                <MenuItem key={team.id} value={team.id}>
                  {team.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField select size="small" label="Assignee" value={filters.assigneeId} onChange={set('assigneeId')} sx={compactSelect}>
            <MenuItem value="">Anyone</MenuItem>
            {assignableMembers.map((member) => (
              <MenuItem key={member.employeeId} value={member.employeeId}>
                {member.fullName}
              </MenuItem>
            ))}
          </TextField>

          <TextField select size="small" label="Priority" value={filters.priority} onChange={set('priority')} sx={compactSelect}>
            <MenuItem value="">Any priority</MenuItem>
            {Object.values(PRIORITIES).map((priority) => (
              <MenuItem key={priority} value={priority}>
                {priority}
              </MenuItem>
            ))}
          </TextField>

          {isEnabled(FEATURES.WEIGHTAGE) ? (
            <TextField select size="small" label="Size" value={filters.sizeKey} onChange={set('sizeKey')} sx={compactSelect}>
              <MenuItem value="">Any size</MenuItem>
              {TASK_SIZES.map((size) => (
                <MenuItem key={size.key} value={size.key}>
                  {size.key} · {size.points} pts
                </MenuItem>
              ))}
            </TextField>
          ) : null}
        </Stack>
      </Collapse>
    </Box>
  )
}
