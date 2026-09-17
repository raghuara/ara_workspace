import { useCallback, useMemo } from 'react'
import { useSession } from './useSession'
import { useWorkspace } from './useWorkspace'

export const useAccess = () => {
  const { groups, access } = useWorkspace()
  const { user } = useSession()

  const levelFor = useCallback(
    ({ groupId, teamId } = {}) => {
      if (access?.admin) return 'edit'
      const group =
        groups.find((candidate) => candidate.id === groupId) ??
        (teamId ? groups.find((candidate) => candidate.teams.some((team) => team.id === teamId)) : null)
      if (!group) return access?.workspace ?? 'none'
      if (teamId) {
        const team = group.teams.find((candidate) => candidate.id === teamId)
        if (team?.access) return team.access
      }
      return group.access ?? access?.workspace ?? 'none'
    },
    [groups, access],
  )

  return useMemo(() => {
    const canEditIn = (scope) => levelFor(scope) === 'edit'
    const editableTeams = (groupId) => {
      const group = groups.find((candidate) => candidate.id === groupId)
      return (group?.teams ?? []).filter((team) => canEditIn({ groupId, teamId: team.id }))
    }
    const editableGroups = groups.filter(
      (group) => canEditIn({ groupId: group.id }) || editableTeams(group.id).length > 0,
    )

    return {
      isAdmin: Boolean(access?.admin),
      levelFor,
      canEditIn,
      canEditTask: (task) => canEditIn(task) || (task?.assigneeIds ?? []).includes(user?.id),
      canCreateAnywhere: editableGroups.length > 0,
      groupOptions: (currentGroupId = null) =>
        groups.filter((group) => group.id === currentGroupId || editableGroups.includes(group)),
      teamOptions: (groupId, currentTeamId = null) => {
        const group = groups.find((candidate) => candidate.id === groupId)
        return (group?.teams ?? []).filter(
          (team) => team.id === currentTeamId || canEditIn({ groupId, teamId: team.id }),
        )
      },
      allowsNoTeam: (groupId) => !groupId || canEditIn({ groupId }),
    }
  }, [access, groups, levelFor, user])
}
