import { TICKET_KINDS } from '@/constants/clientDesk'

const blank = () => ({
  clients: 0,
  primary: 0,
  clientNames: [],
  total: 0,
  open: 0,
  overdue: 0,
  withClient: 0,
  reopened: 0,
  completed: 0,
  kinds: Object.fromEntries(TICKET_KINDS.map((item) => [item.value, 0])),
})

const rate = (done, total) => (total > 0 ? Math.round((done / total) * 100) : null)

/**
 * Who handles clients, and how their Client Desk tickets stand. Built from the
 * client list (which carries its followers) and the ticket list the viewer is
 * already allowed to see, so the board never shows more than the page does.
 */
export const buildDeskCounts = (clients, tickets) => {
  const people = new Map()

  const ensure = (person) => {
    if (!people.has(person.id)) {
      people.set(person.id, {
        id: person.id,
        fullName: person.fullName,
        designation: person.designation && person.designation !== '—' ? person.designation : '',
        ...blank(),
      })
    }
    return people.get(person.id)
  }

  clients.forEach((client) => {
    ;(client.assignees ?? []).forEach((person) => {
      const entry = ensure(person)
      entry.clients += 1
      if (person.isPrimary) entry.primary += 1
      entry.clientNames.push(client.name)
    })
  })

  let unowned = 0

  tickets.forEach((ticket) => {
    if (!ticket.ownerId) {
      unowned += 1
      return
    }
    const entry = ensure({ id: ticket.ownerId, fullName: ticket.ownerName, designation: ticket.ownerDesignation })
    entry.total += 1
    entry.kinds[ticket.kind] = (entry.kinds[ticket.kind] ?? 0) + 1
    if (ticket.status === 'Completed') entry.completed += 1
    else {
      entry.open += 1
      if (ticket.isOverdue) entry.overdue += 1
    }
    if (ticket.status === 'With client') entry.withClient += 1
    if (ticket.reopenCount > 0) entry.reopened += 1
  })

  const rows = [...people.values()]
    .map((person) => ({ ...person, doneRate: rate(person.completed, person.total) }))
    .sort(
      (a, b) =>
        b.open - a.open || b.total - a.total || b.clients - a.clients || a.fullName.localeCompare(b.fullName),
    )

  const totals = rows.reduce(
    (sum, person) => {
      TICKET_KINDS.forEach((item) => {
        sum.kinds[item.value] += person.kinds[item.value] ?? 0
      })
      return {
        ...sum,
        clients: sum.clients + person.clients,
        total: sum.total + person.total,
        open: sum.open + person.open,
        overdue: sum.overdue + person.overdue,
        withClient: sum.withClient + person.withClient,
        reopened: sum.reopened + person.reopened,
        completed: sum.completed + person.completed,
      }
    },
    { ...blank() },
  )

  const distinctClients = new Set(
    clients.filter((client) => (client.assignees ?? []).length > 0).map((client) => client.id),
  ).size

  return {
    rows,
    totals: { ...totals, doneRate: rate(totals.completed, totals.total) },
    distinctClients,
    unhandledClients: clients.length - distinctClients,
    unowned,
  }
}
