const percentOf = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0)

export const buildInsights = ({ tasks, pending, statusSegments, months, yearRange }) => {
  const completedYear = tasks
    .filter((task) => task.statusKind === 'completed')
    .map((task) => ({ ...task, doneOn: task.completedAt ?? task.dueDate ?? task.createdAt }))
    .filter((task) => task.doneOn && task.doneOn >= yearRange.from && task.doneOn <= yearRange.to)

  const pastMonths = months.filter((month) => !month.disabled)
  const byMonth = pastMonths.map((month) => {
    const done = completedYear.filter((task) => task.doneOn >= month.from && task.doneOn <= month.to)
    return {
      key: month.key,
      label: month.short,
      longLabel: month.label,
      points: done.reduce((sum, task) => sum + task.points, 0),
      tasks: done.length,
    }
  })

  const withDueDate = completedYear.filter((task) => task.dueDate)
  const onTime = withDueDate.filter((task) => task.doneOn <= task.dueDate)
  const onTrack = pending.filter((task) => !task.isOverdue)
  const totalPoints = completedYear.reduce((sum, task) => sum + task.points, 0)
  const best = byMonth.reduce((top, month) => (month.points > (top?.points ?? 0) ? month : top), null)

  return {
    byMonth,
    statusSegments,
    totalPoints,
    completedCount: completedYear.length,
    averageSize: completedYear.length ? (totalPoints / completedYear.length).toFixed(1) : '0',
    best,
    rates: [
      {
        label: 'Completed',
        percent: percentOf(completedYear.length, completedYear.length + pending.length),
        hint: `${completedYear.length} of ${completedYear.length + pending.length} tasks`,
      },
      {
        label: 'On time',
        percent: percentOf(onTime.length, withDueDate.length),
        hint: withDueDate.length ? `${onTime.length} of ${withDueDate.length} by the due date` : 'nothing finished yet',
      },
      {
        label: 'On track',
        percent: percentOf(onTrack.length, pending.length),
        hint: pending.length ? `${onTrack.length} of ${pending.length} open, not overdue` : 'no open tasks',
      },
    ],
    total: tasks.length,
  }
}
