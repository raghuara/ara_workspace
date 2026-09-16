import { useState } from 'react'
import { Box, Collapse, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Stack, Tooltip, Typography } from '@mui/material'
import { ChartNoAxesColumn, ChevronRight, Layers, ListTodo, Repeat, UsersRound } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { PERMISSIONS } from '@/constants/permissions'
import { FEATURES } from '@/constants/features'
import { DEFAULT_VIEW, ROUTES, groupViewPath, teamViewPath, workspaceViewPath } from '@/constants/routes'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { useFeatures } from '@/hooks/useFeatures'
import { usePermissions } from '@/hooks/usePermissions'
import { useWorkspace } from '@/hooks/useWorkspace'
import { colors } from '@/theme/tokens'
import { navRowSx, sectionLabelSx, sectionSx } from './navRowSx'

const rowStyles = (active, depth) =>
  navRowSx(active, { pl: depth === 2 ? 4.25 : 2, pr: depth === 1 ? 0.75 : 1.75, minHeight: depth === 2 ? 34 : 36 })

const GroupRow = ({ group, view, activeGroupId, activeTeamId, open, onToggle, onNavigate }) => {
  const tone = STATUS_TONES[group.tone] ?? STATUS_TONES.slate
  const active = activeGroupId === group.id && !activeTeamId
  const hasTeams = group.teams.length > 0

  return (
    <Box>
      <Stack direction="row" spacing={0} sx={{ alignItems: 'center', position: 'relative' }}>
        <ListItemButton
          component={Link}
          to={groupViewPath(group.id, view)}
          onClick={onNavigate}
          aria-current={active ? 'page' : undefined}
          sx={{ ...rowStyles(active, 1), flex: 1, minWidth: 0 }}
        >
          <ListItemIcon>
            <Box aria-hidden="true" sx={{ width: 18, height: 18, display: 'grid', placeItems: 'center' }}>
              <Box sx={{ width: 9, height: 9, borderRadius: '3px', bgcolor: tone.strong }} />
            </Box>
          </ListItemIcon>
          <ListItemText
            primary={group.name}
            slotProps={{ primary: { fontSize: '0.78125rem', fontWeight: active ? 600 : 500, noWrap: true } }}
          />
        </ListItemButton>

        {hasTeams ? (
          <IconButton
            size="small"
            onClick={onToggle}
            aria-label={`${open ? 'Collapse' : 'Expand'} ${group.name} teams`}
            aria-expanded={open}
            sx={{
              width: 24,
              height: 24,
              mr: 0.5,
              color: colors.textSecondary,
              transform: open ? 'rotate(90deg)' : 'none',
              transition: 'transform 140ms ease',
            }}
          >
            <ChevronRight size={14} strokeWidth={2} />
          </IconButton>
        ) : (
          <Box sx={{ width: 24, mr: 0.5, flexShrink: 0 }} />
        )}
      </Stack>

      {hasTeams ? (
        <Collapse in={open} timeout={140} unmountOnExit>
          <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.375, mt: 0.375 }}>
            {group.teams.map((team) => {
              const teamActive = activeTeamId === team.id
              return (
                <ListItemButton
                  key={team.id}
                  component={Link}
                  to={teamViewPath(group.id, team.id, view)}
                  onClick={onNavigate}
                  aria-current={teamActive ? 'page' : undefined}
                  sx={rowStyles(teamActive, 2)}
                >
                  <ListItemIcon sx={{ minWidth: 24 }}>
                    <UsersRound size={14} strokeWidth={teamActive ? 2 : 1.75} aria-hidden="true" />
                  </ListItemIcon>
                  <ListItemText
                    primary={team.name}
                    slotProps={{
                      primary: { fontSize: '0.75rem', fontWeight: teamActive ? 600 : 400, noWrap: true },
                    }}
                  />
                </ListItemButton>
              )
            })}
          </List>
        </Collapse>
      ) : null}
    </Box>
  )
}

export const WorkspaceNavTree = ({ onNavigate }) => {
  const { groups } = useWorkspace()
  const { can } = usePermissions()
  const { isEnabled } = useFeatures()
  const params = useParams()
  const { pathname } = useLocation()

  // Keep whichever view the person is already on when they switch group.
  const view = ['board', 'list', 'table'].includes(params.view) ? params.view : DEFAULT_VIEW
  const activeGroupId = params.groupId ?? null
  const activeTeamId = params.teamId ?? null

  // The active group opens by default; an explicit toggle overrides that.
  const [overrides, setOverrides] = useState({})
  const isOpen = (groupId) => overrides[groupId] ?? activeGroupId === groupId

  if (!isEnabled(FEATURES.WORKSPACES) || !can(PERMISSIONS.TASK_VIEW)) return null

  // "All work" is only the current page inside the workspace area with no
  // group selected — not on the dashboard or any other top-level page.
  const inWorkspace = pathname.startsWith(ROUTES.workspace) && pathname !== ROUTES.reports && pathname !== ROUTES.recurring
  const allActive = inWorkspace && !activeGroupId

  const reportsActive = pathname === ROUTES.reports
  const recurringActive = pathname === ROUTES.recurring

  return (
    <Box component="section" sx={sectionSx}>
      <Typography component="h2" sx={sectionLabelSx}>
        Work
      </Typography>

      <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <ListItemButton
          component={Link}
          to={workspaceViewPath(view)}
          onClick={onNavigate}
          aria-current={allActive ? 'page' : undefined}
          sx={rowStyles(allActive, 0)}
        >
          <ListItemIcon>
            <ListTodo size={18} strokeWidth={allActive ? 2 : 1.75} aria-hidden="true" />
          </ListItemIcon>
          <ListItemText
            primary="All work"
            slotProps={{ primary: { fontSize: '0.8125rem', fontWeight: allActive ? 600 : 500 } }}
          />
        </ListItemButton>

        {can(PERMISSIONS.REPORT_VIEW) && isEnabled(FEATURES.REPORTS) ? (
          <ListItemButton
            component={Link}
            to={ROUTES.reports}
            onClick={onNavigate}
            aria-current={reportsActive ? 'page' : undefined}
            sx={rowStyles(reportsActive, 0)}
          >
            <ListItemIcon>
              <ChartNoAxesColumn size={18} strokeWidth={reportsActive ? 2 : 1.75} aria-hidden="true" />
            </ListItemIcon>
            <ListItemText
              primary="Workload"
              slotProps={{ primary: { fontSize: '0.8125rem', fontWeight: reportsActive ? 600 : 500 } }}
            />
          </ListItemButton>
        ) : null}

        {isEnabled(FEATURES.RECURRING_TASKS) ? (
          <ListItemButton
            component={Link}
            to={ROUTES.recurring}
            onClick={onNavigate}
            aria-current={recurringActive ? 'page' : undefined}
            sx={rowStyles(recurringActive, 0)}
          >
            <ListItemIcon>
              <Repeat size={18} strokeWidth={recurringActive ? 2 : 1.75} aria-hidden="true" />
            </ListItemIcon>
            <ListItemText
              primary="Recurring"
              slotProps={{ primary: { fontSize: '0.8125rem', fontWeight: recurringActive ? 600 : 500 } }}
            />
          </ListItemButton>
        ) : null}

        {groups.length > 0 ? (
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', px: 2, mt: 1.5, mb: 0.5 }}>
            <Layers size={12} strokeWidth={1.75} color={colors.textSecondary} aria-hidden="true" />
            <Typography variant="caption" sx={{ fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.04em' }}>
              Groups
            </Typography>
          </Stack>
        ) : null}

        {groups.map((group) => (
          <GroupRow
            key={group.id}
            group={group}
            view={view}
            activeGroupId={activeGroupId}
            activeTeamId={activeTeamId}
            open={isOpen(group.id)}
            onToggle={() =>
              setOverrides((current) => ({ ...current, [group.id]: !isOpen(group.id) }))
            }
            onNavigate={onNavigate}
          />
        ))}

        {groups.length === 0 ? (
          <Tooltip title="Add groups under Administration → Workspaces">
            <Typography variant="caption" component="p" sx={{ px: 2, py: 1 }}>
              No groups yet
            </Typography>
          </Tooltip>
        ) : null}
      </List>
    </Box>
  )
}
