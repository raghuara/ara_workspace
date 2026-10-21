import { useEffect, useRef } from 'react'
import { queryClient } from '@/api/queryClient'
import { runWhenIdle } from '@/api/realtimeGate'
import { socket } from '@/api/socketClient'
import { useSession } from '@/hooks/useSession'
import { useWorkspace } from '@/hooks/useWorkspace'

const STRUCTURE_ENTITIES = new Set(['columns', 'structure', 'members', 'clients'])
const WORKSPACE_LIST_ENTITIES = new Set(['workspace', 'members'])

const nameOf = (query) => String(query.queryKey[0] ?? '').split('#')[0]

const keyMatches = (query, name, value) =>
  nameOf(query) === name && String(query.queryKey[1]) === String(value)

const scopedToWorkspace = (query, workspaceId) => String(query.queryKey[1]) === String(workspaceId)

export const RealtimeSync = () => {
  const { user } = useSession()
  const { refreshStructure, refreshWorkspaces } = useWorkspace()
  const latest = useRef({ meId: null, refreshStructure, refreshWorkspaces })

  useEffect(() => {
    latest.current = { meId: user?.id ?? null, refreshStructure, refreshWorkspaces }
  }, [user, refreshStructure, refreshWorkspaces])

  useEffect(() => {
    const handleChange = (event) => {
      if (!event?.workspaceId || !event?.entityType) return
      if (event.actorId && event.actorId === latest.current.meId) return

      runWhenIdle(`${event.entityType}:${event.workspaceId}:${event.taskId ?? event.ticketId ?? ''}`, () => {
        if (event.entityType === 'tickets') {
          queryClient.invalidateQueries({
            predicate: (query) => ['listTickets', 'getTicket', 'listEvents'].includes(nameOf(query)),
          })
          return
        }

        if (event.entityType === 'comments') {
          queryClient.invalidateQueries({
            predicate: (query) =>
              keyMatches(query, 'listComments', event.taskId) ||
              keyMatches(query, 'getTaskHistory', event.taskId) ||
              keyMatches(query, 'getBoard', event.workspaceId),
          })
          return
        }

        queryClient.invalidateQueries({ predicate: (query) => scopedToWorkspace(query, event.workspaceId) })

        if (STRUCTURE_ENTITIES.has(event.entityType)) latest.current.refreshStructure()
        if (WORKSPACE_LIST_ENTITIES.has(event.entityType)) latest.current.refreshWorkspaces()
      })
    }

    const handleAccessChange = () => {
      runWhenIdle('access-changed', () => {
        latest.current.refreshWorkspaces()
        latest.current.refreshStructure()
      })
    }

    socket.on('workspace:changed', handleChange)
    socket.on('workspace:access-changed', handleAccessChange)

    return () => {
      socket.off('workspace:changed', handleChange)
      socket.off('workspace:access-changed', handleAccessChange)
    }
  }, [])

  return null
}
