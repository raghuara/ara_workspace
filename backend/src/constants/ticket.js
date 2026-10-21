const TICKET_KINDS = ["Complaint", "Requirement", "Change", "New request", "Other"];

// New -> In progress -> With client -> Completed, with Reopened looping back
// whenever the client asks for another round of changes on the same token.
const TICKET_STATUSES = ["New", "In progress", "With client", "Completed", "Reopened"];

const OPEN_TICKET_STATUSES = ["New", "In progress", "With client", "Reopened"];

module.exports = { TICKET_KINDS, TICKET_STATUSES, OPEN_TICKET_STATUSES };
