import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { workspaceService } from '@/api/workspaceService'
import { clientService } from '@/api/clientService'
import { WorkspaceContext } from './workspaceContext'

const STORAGE_KEY = 'ara.activeWorkspaceId'

const readStoredWorkspace = () => {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

const storeWorkspace = (workspaceId) => {
  try {
    localStorage.setItem(STORAGE_KEY, workspaceId)
  } catch {
    // Private browsing or blocked storage — the selection just won't persist.
  }
}

const EMPTY_DETAIL = { structure: { groups: [], members: [], access: { admin: false, workspace: 'none' } }, columns: [], clients: [] }

/** Pure fetch — returns data instead of writing state, so callers control timing. */
const fetchDetail = async (workspaceId) => {
  if (!workspaceId) return EMPTY_DETAIL
  const [structure, columns, clients] = await Promise.all([
    workspaceService.listStructure(workspaceId),
    workspaceService.listColumns(workspaceId),
    clientService.listClientOptions(workspaceId).catch(() => []),
  ])
  return { structure, columns, clients }
}

export const WorkspaceProvider = ({ children }) => {
  const [workspaces, setWorkspaces] = useState([])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null)
  const [detail, setDetail] = useState(EMPTY_DETAIL)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      let list
      try {
        list = await workspaceService.listWorkspaces()
      } catch {
        list = []
      }
      if (cancelled) return

      setWorkspaces(list)

      if (list.length === 0) {
        setLoading(false)
        return
      }

      const stored = readStoredWorkspace()
      const initial = list.some((workspace) => workspace.id === stored) ? stored : list[0].id

      let loaded
      try {
        loaded = await fetchDetail(initial)
      } catch {
        loaded = EMPTY_DETAIL
      }
      if (cancelled) return

      setActiveWorkspaceId(initial)
      setDetail(loaded)
      setLoading(false)
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

  const selectWorkspace = useCallback(async (workspaceId) => {
    storeWorkspace(workspaceId)
    const loaded = await fetchDetail(workspaceId)
    setActiveWorkspaceId(workspaceId)
    setDetail(loaded)
  }, [])

  const refreshStructure = useCallback(async () => {
    if (!activeWorkspaceId) return
    const loaded = await fetchDetail(activeWorkspaceId)
    setDetail(loaded)
  }, [activeWorkspaceId])

  const refreshWorkspaces = useCallback(
    async (preferredId) => {
      const list = await workspaceService.listWorkspaces()
      setWorkspaces(list)

      const stillThere = list.some((workspace) => workspace.id === activeWorkspaceId)
      const target = list.some((workspace) => workspace.id === preferredId)
        ? preferredId
        : activeWorkspaceId && stillThere
          ? null
          : (list[0]?.id ?? null)

      if (target) await selectWorkspace(target)
      else if (!list.length) {
        setActiveWorkspaceId(null)
        setDetail(EMPTY_DETAIL)
      }
      return list
    },
    [activeWorkspaceId, selectWorkspace],
  )

  const teams = useMemo(
    () =>
      detail.structure.groups.flatMap((group) =>
        group.teams.map((team) => ({ ...team, groupName: group.name })),
      ),
    [detail.structure.groups],
  )

  const assignableMembers = useMemo(() => {
    const seen = new Map()
    detail.structure.members.forEach((member) => seen.set(member.employeeId, member))
    teams.forEach((team) => {
      team.members.forEach((member) => {
        if (!seen.has(member.id)) {
          seen.set(member.id, { employeeId: member.id, fullName: member.fullName, designation: '—' })
        }
      })
    })
    return [...seen.values()].sort((a, b) => a.fullName.localeCompare(b.fullName))
  }, [detail.structure.members, teams])

  const value = useMemo(
    () => ({
      workspaces,
      activeWorkspaceId,
      activeWorkspace: workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null,
      groups: detail.structure.groups,
      members: detail.structure.members,
      access: detail.structure.access ?? { admin: false, workspace: 'none' },
      columns: detail.columns,
      clients: detail.clients,
      teams,
      assignableMembers,
      loading,
      selectWorkspace,
      refreshStructure,
      refreshWorkspaces,
    }),
    [
      workspaces,
      activeWorkspaceId,
      detail,
      teams,
      assignableMembers,
      loading,
      selectWorkspace,
      refreshStructure,
      refreshWorkspaces,
    ],
  )

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 360 }}>
        <CircularProgress size={26} aria-label="Loading workspace" />
      </Box>
    )
  }

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}
