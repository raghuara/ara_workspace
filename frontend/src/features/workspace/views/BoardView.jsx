import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Alert, Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import { keyframes } from '@mui/material/styles'
import { Plus } from 'lucide-react'
import { StatusChip } from '@/components/StatusChip'
import { GroupMenu } from '../components/GroupMenu'
import { QuickAddCard } from '../components/QuickAddCard'
import { TaskCard } from '../components/TaskCard'
import { taskService } from '@/api/taskService'
import { pauseRealtime, resumeRealtime } from '@/api/realtimeGate'
import { PERMISSIONS } from '@/constants/permissions'
import { STATUS_TONES } from '@/constants/workspaceDomain'
import { usePermissions } from '@/hooks/usePermissions'
import { useAccess } from '@/hooks/useAccess'
import { useWorkspace } from '@/hooks/useWorkspace'
import { colors, layout } from '@/theme/tokens'

// A phone shows one column plus a sliver of the next, so the board is
// visibly swipeable; from sm up it returns to a fixed comfortable width.
const COLUMN_WIDTH = { xs: '82vw', sm: layout.boardColumnWidth }

const DRAG_THRESHOLD = 6
const TOUCH_HOLD_MS = 220
const SCROLL_EDGE = 48
const SCROLL_SPEED = 14
const SETTLE_MS = 360

const lift = keyframes`
  from { transform: none; }
  to { transform: rotate(2deg) scale(1.03); }
`

const slotIn = keyframes`
  from { opacity: 0; transform: scaleY(0.7); }
  to { opacity: 1; transform: none; }
`

const preventScroll = (event) => event.preventDefault()

const detach = (listeners) => {
  if (!listeners) return
  window.removeEventListener('pointermove', listeners.move)
  window.removeEventListener('pointerup', listeners.up)
  window.removeEventListener('pointercancel', listeners.cancel)
  window.removeEventListener('keydown', listeners.key)
}

const grabBody = (pointerType) => {
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'grabbing'
  if (pointerType === 'touch') window.addEventListener('touchmove', preventScroll, { passive: false })
}

const releaseBody = () => {
  window.removeEventListener('touchmove', preventScroll)
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
}

const findTask = (columns, taskId) => columns.flatMap((column) => column.tasks).find((task) => task.id === taskId)

const moveWithin = (columns, taskId, toColumnId, index, patch = {}) => {
  const task = findTask(columns, taskId)
  if (!task) return columns
  const moved = { ...task, ...patch }

  return columns.map((column) => {
    const rest = column.tasks.filter((item) => item.id !== taskId)
    let tasks = rest
    if (column.id === toColumnId) {
      const at = Math.min(Math.max(index, 0), rest.length)
      tasks = [...rest.slice(0, at), moved, ...rest.slice(at)]
    }
    return {
      ...column,
      tasks,
      taskCount: tasks.length,
      points: tasks.reduce((sum, item) => sum + item.points, 0),
    }
  })
}

const patchTask = (columns, taskId, patch) =>
  columns.map((column) => ({
    ...column,
    tasks: column.tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task)),
  }))

const recount = (column, tasks) => ({
  ...column,
  tasks,
  taskCount: tasks.length,
  points: tasks.reduce((sum, item) => sum + item.points, 0),
})

const insertTask = (columns, columnId, index, task) =>
  columns.map((column) => {
    if (column.id !== columnId) return column
    const at = Math.min(Math.max(index, 0), column.tasks.length)
    return recount(column, [...column.tasks.slice(0, at), task, ...column.tasks.slice(at)])
  })

const removeTask = (columns, taskId) =>
  columns.map((column) =>
    column.tasks.some((task) => task.id === taskId)
      ? recount(
          column,
          column.tasks.filter((task) => task.id !== taskId),
        )
      : column,
  )

export const BoardView = ({
  board,
  loading,
  scope,
  onOpenTask,
  onAddGroup,
  onRemoveGroup,
  onChanged,
  onBoardChange,
}) => {
  const { can } = usePermissions()
  const { activeWorkspaceId } = useWorkspace()
  const canMove = can(PERMISSIONS.TASK_MOVE)
  const { canMoveTask, canCreateAnywhere } = useAccess()
  const canCreate = can(PERMISSIONS.TASK_CREATE) && canCreateAnywhere
  const canManageGroups = can(PERMISSIONS.STATUS_MANAGE) && Boolean(onRemoveGroup)

  const columns = board?.columns ?? []

  const [drag, setDrag] = useState(null)
  const [target, setTarget] = useState(null)
  const [settledId, setSettledId] = useState(null)
  const [moveError, setMoveError] = useState(null)
  const [composerColumnId, setComposerColumnId] = useState(null)
  const [editingTaskId, setEditingTaskId] = useState(null)

  const scrollerRef = useRef(null)
  const overlayRef = useRef(null)
  const boardRef = useRef(board)
  const pendingRef = useRef(null)
  const dragRef = useRef(null)
  const targetRef = useRef(null)
  const pointerRef = useRef({ x: 0, y: 0 })
  const rafRef = useRef(null)
  const listenersRef = useRef(null)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    boardRef.current = board
  }, [board])

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(pendingRef.current?.timer)
      detach(listenersRef.current)
      releaseBody()
      resumeRealtime()
    },
    [],
  )

  const teardown = () => {
    cancelAnimationFrame(rafRef.current)
    clearTimeout(pendingRef.current?.timer)
    detach(listenersRef.current)
    listenersRef.current = null
    releaseBody()
    resumeRealtime()
    pendingRef.current = null
    dragRef.current = null
    targetRef.current = null
  }

  const locateTarget = (x, y) => {
    const scroller = scrollerRef.current
    const dragging = dragRef.current
    if (!scroller || !dragging) return null

    for (const root of scroller.querySelectorAll('[data-column-id]')) {
      const rect = root.getBoundingClientRect()
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue

      const columnId = root.dataset.columnId
      if (columnId === dragging.fromColumnId) return null

      let index = 0
      for (const card of root.querySelectorAll('[data-task-id]')) {
        const cardRect = card.getBoundingClientRect()
        if (y > cardRect.top + cardRect.height / 2) index += 1
      }
      return { columnId, index }
    }
    return null
  }

  const updateTarget = (x, y) => {
    const next = locateTarget(x, y)
    const prev = targetRef.current
    if (next?.columnId === prev?.columnId && next?.index === prev?.index) return
    targetRef.current = next
    setTarget(next)
  }

  const positionOverlay = (x, y) => {
    const dragging = dragRef.current
    if (!dragging || !overlayRef.current) return
    overlayRef.current.style.transform = `translate(${x - dragging.offsetX}px, ${y - dragging.offsetY}px)`
  }

  useLayoutEffect(() => {
    if (drag) positionOverlay(pointerRef.current.x, pointerRef.current.y)
  })

  const autoScroll = () => {
    const { x, y } = pointerRef.current
    const scroller = scrollerRef.current
    let scrolled = false

    if (scroller && dragRef.current) {
      const rect = scroller.getBoundingClientRect()
      const dx =
        x < rect.left + SCROLL_EDGE
          ? -(SCROLL_EDGE - (x - rect.left))
          : x > rect.right - SCROLL_EDGE
            ? SCROLL_EDGE - (rect.right - x)
            : 0
      if (dx) {
        scroller.scrollLeft += (dx / SCROLL_EDGE) * SCROLL_SPEED
        scrolled = true
      }

      const list = document.elementFromPoint(x, y)?.closest('[data-column-list]')
      if (list) {
        const listRect = list.getBoundingClientRect()
        const dy =
          y < listRect.top + SCROLL_EDGE
            ? -(SCROLL_EDGE - (y - listRect.top))
            : y > listRect.bottom - SCROLL_EDGE
              ? SCROLL_EDGE - (listRect.bottom - y)
              : 0
        if (dy) {
          list.scrollTop += (dy / SCROLL_EDGE) * SCROLL_SPEED
          scrolled = true
        }
      }

      if (scrolled) updateTarget(x, y)
    }

    rafRef.current = requestAnimationFrame(autoScroll)
  }

  const finishDrag = () => {
    teardown()
    setDrag(null)
    setTarget(null)
  }

  const settle = (taskId) => {
    setSettledId(taskId)
    setTimeout(() => setSettledId((id) => (id === taskId ? null : id)), SETTLE_MS)
  }

  const handleCreated = (task) => {
    const current = boardRef.current
    if (!current) return
    onBoardChange?.({ ...current, columns: insertTask(current.columns, task.statusId, 0, task) })
    setComposerColumnId(null)
    settle(task.id)
  }

  const handleCardAction = async (type, task, extra = {}) => {
    const current = boardRef.current
    if (!current) return
    const column = current.columns.find((item) => item.id === task.statusId)
    const fromIndex = Math.max(0, column?.tasks.findIndex((item) => item.id === task.id) ?? 0)

    if (type === 'edit') {
      setEditingTaskId(task.id)
      return
    }

    if (type === 'complete' || type === 'move') {
      const to =
        type === 'complete'
          ? current.columns.find((item) => item.kind === 'completed')
          : current.columns.find((item) => item.id === extra.columnId)
      if (!to || to.id === task.statusId) return
      commitMove(task, task.statusId, fromIndex, { columnId: to.id, index: to.tasks.length })
      return
    }

    if (!onBoardChange) {
      onChanged?.()
      return
    }

    setMoveError(null)

    if (type === 'rename') {
      onBoardChange({ ...current, columns: patchTask(current.columns, task.id, { title: extra.title }) })
      try {
        const saved = await taskService.updateTask(task.id, { title: extra.title })
        const latest = boardRef.current
        if (latest) onBoardChange({ ...latest, columns: patchTask(latest.columns, task.id, saved) })
      } catch (error) {
        const latest = boardRef.current
        if (latest) onBoardChange({ ...latest, columns: patchTask(latest.columns, task.id, { title: task.title }) })
        setMoveError(error?.message ?? 'The task could not be renamed.')
      }
      return
    }

    if (type === 'duplicate') {
      try {
        const saved = await taskService.createTask(activeWorkspaceId, {
          title: `${task.title} (copy)`,
          description: task.description ?? '',
          clientId: task.clientId,
          groupId: task.groupId,
          teamId: task.teamId,
          statusId: task.statusId,
          assigneeIds: task.assigneeIds ?? [],
          priority: task.priority,
          sizeKey: task.sizeKey,
          points: task.points,
          dueDate: task.dueDate,
          scheduledDate: task.scheduledDate,
          tags: task.tags ?? [],
        })
        const latest = boardRef.current
        if (latest)
          onBoardChange({ ...latest, columns: insertTask(latest.columns, saved.statusId, fromIndex + 1, saved) })
        settle(saved.id)
      } catch (error) {
        setMoveError(error?.message ?? 'The task could not be duplicated.')
      }
      return
    }

    if (type === 'delete') {
      onBoardChange({ ...current, columns: removeTask(current.columns, task.id) })
      try {
        await taskService.deleteTask(task.id)
      } catch (error) {
        const latest = boardRef.current
        if (latest) onBoardChange({ ...latest, columns: insertTask(latest.columns, task.statusId, fromIndex, task) })
        setMoveError(error?.message ?? 'The task could not be deleted. It has been put back.')
      }
    }
  }

  const commitMove = async (task, fromColumnId, fromIndex, { columnId, index }) => {
    const current = boardRef.current
    const toColumn = current?.columns.find((column) => column.id === columnId)
    if (!current || !toColumn) return

    if (!onBoardChange) {
      try {
        await taskService.moveTask(task.id, columnId)
        onChanged?.()
      } catch (error) {
        setMoveError(error?.message ?? 'The task could not be moved.')
      }
      return
    }

    const optimistic = {
      statusId: toColumn.id,
      statusName: toColumn.name,
      statusTone: toColumn.tone,
      statusKind: toColumn.kind,
      isOverdue: toColumn.kind === 'completed' ? false : task.isOverdue,
    }

    setMoveError(null)
    onBoardChange({ ...current, columns: moveWithin(current.columns, task.id, columnId, index, optimistic) })
    settle(task.id)

    try {
      const saved = await taskService.moveTask(task.id, columnId)
      const latest = boardRef.current
      if (latest) onBoardChange({ ...latest, columns: patchTask(latest.columns, task.id, saved) })
    } catch (error) {
      const latest = boardRef.current
      if (latest)
        onBoardChange({ ...latest, columns: moveWithin(latest.columns, task.id, fromColumnId, fromIndex, task) })
      setMoveError(error?.message ?? 'The task could not be moved. It has been put back.')
    }
  }

  const startDrag = (pending, x, y) => {
    clearTimeout(pending.timer)
    pendingRef.current = null

    try {
      pending.element.setPointerCapture(pending.pointerId)
    } catch {
      // Pointer already released; the window listeners still cover it.
    }

    const dragging = {
      task: pending.task,
      fromColumnId: pending.columnId,
      fromIndex: pending.index,
      width: pending.width,
      height: pending.height,
      offsetX: pending.offsetX,
      offsetY: pending.offsetY,
      x,
      y,
    }
    dragRef.current = dragging
    pointerRef.current = { x, y }
    setDrag(dragging)

    grabBody(pending.pointerType)
    pauseRealtime()
    rafRef.current = requestAnimationFrame(autoScroll)
  }

  const handlePointerDown = (event, task, columnId, index) => {
    if (!canMove || drag) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (event.target.closest('a, button')) return

    const element = event.currentTarget
    const rect = element.getBoundingClientRect()
    const pending = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      task,
      columnId,
      index,
      element,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      timer: null,
    }
    pendingRef.current = pending

    const move = (moveEvent) => {
      const waiting = pendingRef.current
      if (waiting) {
        const distance = Math.hypot(moveEvent.clientX - waiting.startX, moveEvent.clientY - waiting.startY)
        if (distance <= DRAG_THRESHOLD) return
        if (waiting.pointerType === 'touch') {
          teardown()
          return
        }
        startDrag(waiting, moveEvent.clientX, moveEvent.clientY)
      }
      if (!dragRef.current) return
      pointerRef.current = { x: moveEvent.clientX, y: moveEvent.clientY }
      positionOverlay(moveEvent.clientX, moveEvent.clientY)
      updateTarget(moveEvent.clientX, moveEvent.clientY)
    }

    const up = () => {
      if (pendingRef.current) {
        teardown()
        return
      }
      const dragging = dragRef.current
      if (!dragging) return
      const dropTarget = targetRef.current
      finishDrag()
      suppressClickRef.current = true
      setTimeout(() => {
        suppressClickRef.current = false
      }, 120)
      if (dropTarget) commitMove(dragging.task, dragging.fromColumnId, dragging.fromIndex, dropTarget)
    }

    const cancel = () => {
      if (dragRef.current) finishDrag()
      else teardown()
    }

    const key = (keyEvent) => {
      if (keyEvent.key === 'Escape') cancel()
    }

    detach(listenersRef.current)
    listenersRef.current = { move, up, cancel, key }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('keydown', key)

    if (event.pointerType === 'touch') {
      pending.timer = setTimeout(() => {
        if (pendingRef.current === pending) startDrag(pending, pending.startX, pending.startY)
      }, TOUCH_HOLD_MS)
    }
  }

  const openTask = (task) => {
    if (suppressClickRef.current) return
    onOpenTask?.(task)
  }

  if (loading && !board) {
    return (
      <Stack direction="row" spacing={2}>
        {[0, 1, 2, 3].map((index) => (
          <Box
            key={index}
            sx={{
              width: COLUMN_WIDTH,
              height: 320,
              borderRadius: 2.5,
              bgcolor: colors.neutralSoft,
              flexShrink: 0,
            }}
          />
        ))}
      </Stack>
    )
  }

  return (
    <>
      {moveError ? (
        <Alert severity="error" onClose={() => setMoveError(null)} sx={{ mb: 1.5 }}>
          {moveError}
        </Alert>
      ) : null}

      <Box
        ref={scrollerRef}
        sx={{
          display: 'flex',
          gap: { xs: 1.25, sm: 2 },
          overflowX: 'auto',
          pb: 2,
          alignItems: 'flex-start',
          // Swiping a phone should land on a column, not halfway between two.
          scrollSnapType: { xs: 'x mandatory', sm: 'none' },
          ...(drag && { scrollSnapType: 'none' }),
        }}
      >
        {columns.map((column) => {
          const tone = STATUS_TONES[column.tone] ?? STATUS_TONES.slate
          const isDropTarget = Boolean(drag) && target?.columnId === column.id

          const cards = column.tasks.map((task, index) =>
            editingTaskId === task.id ? (
              <QuickAddCard
                key={task.id}
                column={column}
                task={task}
                onCancel={() => setEditingTaskId(null)}
                onSaved={(saved) => {
                  setEditingTaskId(null)
                  const latest = boardRef.current
                  if (latest && onBoardChange)
                    onBoardChange({ ...latest, columns: patchTask(latest.columns, task.id, saved) })
                  else onChanged?.()
                }}
              />
            ) : (
              <TaskCard
                key={task.id}
                task={task}
                columns={columns}
                draggable={canMove && canMoveTask(task)}
                isDragging={drag?.task.id === task.id}
                isSettling={settledId === task.id}
                onOpen={openTask}
                onAction={handleCardAction}
                onPointerDown={(event) => handlePointerDown(event, task, column.id, index)}
              />
            ),
          )

          if (composerColumnId === column.id) {
            cards.unshift(
              <QuickAddCard
                key="composer"
                column={column}
                defaultGroupId={scope?.groupId || undefined}
                defaultTeamId={scope?.teamId || undefined}
                onCancel={() => setComposerColumnId(null)}
                onCreated={handleCreated}
              />,
            )
          }

          if (isDropTarget) {
            cards.splice(
              target.index,
              0,
              <Box
                key="drop-slot"
                aria-hidden="true"
                sx={{
                  height: drag.height,
                  borderRadius: 2,
                  border: `2px dashed ${tone.strong}`,
                  bgcolor: 'rgba(255, 255, 255, 0.55)',
                  opacity: 0.7,
                  transformOrigin: 'top',
                  animation: `${slotIn} 140ms ease-out`,
                }}
              />,
            )
          }

          return (
            <Box
              key={column.id}
              data-column-id={column.id}
              sx={{
                width: COLUMN_WIDTH,
                flexShrink: 0,
                scrollSnapAlign: 'start',
                bgcolor: tone.tint,
                border: `1px solid ${tone.border}`,
                borderRadius: 2.5,
                // Base is already tinted, so a drop target reads as a ring rather
                // than another fill.
                outline: isDropTarget ? `2px solid ${tone.strong}` : '2px solid transparent',
                outlineOffset: -1,
                transition: 'outline-color 120ms ease',
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: 'center',
                  px: 1.25,
                  py: 1,
                  // The whole column is tinted now, so the header only needs a
                  // separator in the same family — no second fill.
                  borderBottom: `1px solid ${tone.border}`,
                }}
              >
                <StatusChip label={column.name} tone={column.tone} sx={{ minWidth: 0 }} />
                <Box sx={{ flex: 1 }} />
                <Tooltip title={`${column.taskCount} tasks · ${column.points} points`}>
                  <Typography variant="caption" sx={{ color: tone.strong, fontWeight: 600 }}>
                    {column.taskCount}
                  </Typography>
                </Tooltip>
                {canCreate ? (
                  <IconButton
                    size="small"
                    aria-label={`Add task to ${column.name}`}
                    onClick={() => setComposerColumnId(column.id)}
                    sx={{ color: tone.strong }}
                  >
                    <Plus size={15} strokeWidth={2} />
                  </IconButton>
                ) : null}
                {canManageGroups ? (
                  <GroupMenu
                    column={column}
                    color={tone.strong}
                    onAddTask={canCreate ? () => setComposerColumnId(column.id) : undefined}
                    onRemove={onRemoveGroup}
                  />
                ) : null}
              </Stack>

              <Stack
                data-column-list=""
                spacing={1}
                sx={{ p: 1, minHeight: 110, maxHeight: { xs: 'none', sm: 'calc(100dvh - 292px)' }, overflowY: 'auto' }}
              >
                {cards}

                {column.tasks.length === 0 && !isDropTarget ? (
                  <Box
                    sx={{
                      border: `1px dashed ${tone.border}`,
                      borderRadius: 2,
                      py: 3,
                      textAlign: 'center',
                      color: tone.strong,
                      fontSize: '0.8125rem',
                    }}
                  >
                    {canMove ? 'Drop tasks here' : 'Nothing here'}
                  </Box>
                ) : null}

                {canCreate ? (
                  <Button
                    size="small"
                    onClick={() => setComposerColumnId(column.id)}
                    startIcon={<Plus size={14} strokeWidth={2} />}
                    sx={{ justifyContent: 'flex-start', color: colors.textSecondary }}
                  >
                    Add task
                  </Button>
                ) : null}
              </Stack>
            </Box>
          )
        })}

        {can(PERMISSIONS.STATUS_MANAGE) ? (
          <Box sx={{ width: { xs: '82vw', sm: 200 }, flexShrink: 0 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={onAddGroup}
              startIcon={<Plus size={16} strokeWidth={2} />}
              sx={{ borderStyle: 'dashed', justifyContent: 'flex-start', py: 1.25 }}
            >
              Add group
            </Button>
          </Box>
        ) : null}
      </Box>

      {drag
        ? createPortal(
            <Box
              ref={overlayRef}
              aria-hidden="true"
              sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: drag.width,
                zIndex: 1500,
                pointerEvents: 'none',
                willChange: 'transform',
              }}
            >
              <Box sx={{ animation: `${lift} 160ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards` }}>
                <TaskCard task={drag.task} lifted />
              </Box>
            </Box>,
            document.body,
          )
        : null}
    </>
  )
}
