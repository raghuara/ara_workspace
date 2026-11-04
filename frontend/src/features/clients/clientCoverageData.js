/** Turns the client list inside out: who handles what, and who is covered by nobody. */
export const buildCoverage = (clients) => {
  const people = new Map()
  const unassigned = []

  clients.forEach((client) => {
    const assignees = client.assignees ?? []
    if (assignees.length === 0) {
      unassigned.push(client)
      return
    }
    assignees.forEach((person) => {
      const entry = people.get(person.id) ?? { ...person, clients: [], leadFor: [] }
      entry.clients.push(client)
      if (person.isPrimary) entry.leadFor.push(client)
      people.set(person.id, entry)
    })
  })

  return {
    people: [...people.values()].sort(
      (a, b) => b.clients.length - a.clients.length || a.fullName.localeCompare(b.fullName),
    ),
    unassigned,
    total: clients.length,
  }
}

export const countByClient = (tickets) => {
  const counts = new Map()
  tickets.forEach((ticket) => counts.set(ticket.clientId, (counts.get(ticket.clientId) ?? 0) + 1))
  return counts
}
