CREATE TABLE client_assignees (
  client_id VARCHAR(20) NOT NULL,
  employee_id VARCHAR(20) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_at DATETIME NOT NULL,
  PRIMARY KEY (client_id, employee_id),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  INDEX idx_client_assignees_employee (employee_id)
);

CREATE TABLE client_tickets (
  id VARCHAR(20) PRIMARY KEY,
  workspace_id VARCHAR(20) NOT NULL,
  client_id VARCHAR(20) NOT NULL,
  kind ENUM('Complaint', 'Requirement', 'Change', 'New request', 'Other') NOT NULL DEFAULT 'Requirement',
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  status ENUM('New', 'In progress', 'Waiting on client', 'Resolved', 'Closed', 'Reopened') NOT NULL DEFAULT 'New',
  priority ENUM('Urgent', 'High', 'Normal', 'Low') NOT NULL DEFAULT 'Normal',
  collected_on DATE NULL,
  due_date DATE NULL,
  raised_by_id VARCHAR(20) NULL,
  owner_id VARCHAR(20) NULL,
  reopen_count INT NOT NULL DEFAULT 0,
  resolved_at DATETIME NULL,
  closed_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (raised_by_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
  FOREIGN KEY (owner_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
  INDEX idx_client_tickets_workspace (workspace_id, status),
  INDEX idx_client_tickets_due (workspace_id, due_date),
  INDEX idx_client_tickets_client (client_id),
  INDEX idx_client_tickets_owner (owner_id, status)
);

CREATE TABLE client_ticket_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id VARCHAR(20) NOT NULL,
  workspace_id VARCHAR(20) NOT NULL,
  actor_id VARCHAR(20) NULL,
  action ENUM('created', 'status', 'note', 'reopened', 'assigned', 'updated') NOT NULL,
  summary VARCHAR(255) NOT NULL,
  detail JSON NULL,
  at DATETIME NOT NULL,
  FOREIGN KEY (ticket_id) REFERENCES client_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
  INDEX idx_client_ticket_events (ticket_id, at)
);

UPDATE user_types
SET permissions = JSON_ARRAY_APPEND(permissions, '$', 'ticket.view')
WHERE JSON_SEARCH(permissions, 'one', 'ticket.view') IS NULL AND id IN (1, 2, 3, 4, 5);

UPDATE user_types
SET permissions = JSON_ARRAY_APPEND(permissions, '$', 'ticket.manage')
WHERE JSON_SEARCH(permissions, 'one', 'ticket.manage') IS NULL AND id IN (1, 2, 3, 4, 5);
