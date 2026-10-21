const ticketModel = require("../models/ticket.model");

// Handling clients is itself the grant: whoever has clients assigned to them on
// the Clients page gets the Client Desk, whatever their user type says.
const IMPLIED_BY_CLIENTS = ["ticket.view", "ticket.manage"];

const effectivePermissions = async (granted, employeeId) => {
  if (IMPLIED_BY_CLIENTS.every((permission) => granted.includes(permission))) return granted;
  if (!(await ticketModel.handlesAnyClient(employeeId))) return granted;
  return [...new Set([...granted, ...IMPLIED_BY_CLIENTS])];
};

module.exports = { effectivePermissions, IMPLIED_BY_CLIENTS };
