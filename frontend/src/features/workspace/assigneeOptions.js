const SUPERVISOR = 'supervisor'

const toOption = (member, known) => ({
  employeeId: member.id,
  fullName: member.fullName,
  designation:
    member.designation && member.designation !== '—' ? member.designation : (known?.designation ?? ''),
  oversees: member.role === SUPERVISOR,
})

const byRoleThenName = (a, b) => Number(a.oversees) - Number(b.oversees) || a.fullName.localeCompare(b.fullName)

const dedupe = (people) => [...new Map(people.map((person) => [person.employeeId, person])).values()]

/**
 * Who a task can go to. Filed under a team, it offers that team's members;
 * filed at group level, everyone across that group's teams. The rest of the
 * workspace stays available but out of the way.
 */
export const assigneeChoices = ({ team, group, members = [], selectedIds = [] }) => {
  const known = new Map(members.map((member) => [member.employeeId, member]))
  const collect = (list) => (list ?? []).map((member) => toOption(member, known.get(member.id)))

  const inScope = dedupe(
    team ? collect(team.members) : (group?.teams ?? []).flatMap((item) => collect(item.members)),
  ).sort(byRoleThenName)

  const scopeIds = new Set(inScope.map((person) => person.employeeId))
  const rest = members.filter((member) => !scopeIds.has(member.employeeId))

  return {
    scoped: inScope.length > 0,
    label: team?.name ? `${team.name} team` : group?.name ? `${group.name} group` : 'Everyone',
    inScope,
    rest,
    alsoAssigned: rest.filter((member) => selectedIds.includes(member.employeeId)),
  }
}
