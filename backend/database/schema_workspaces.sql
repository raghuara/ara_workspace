CREATE TABLE workspaces (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  short_name VARCHAR(10) NOT NULL,
  description VARCHAR(255) NULL,
  tone VARCHAR(20) NOT NULL DEFAULT 'blue',
  owner_id VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES employees(employee_id)
);

CREATE TABLE workspace_admins (
  workspace_id VARCHAR(20) NOT NULL,
  employee_id VARCHAR(20) NOT NULL,
  PRIMARY KEY (workspace_id, employee_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
);

CREATE TABLE workspace_groups (
  id VARCHAR(20) PRIMARY KEY,
  workspace_id VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  tone VARCHAR(20) NOT NULL DEFAULT 'blue',
  lead_id VARCHAR(20) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_id) REFERENCES employees(employee_id) ON DELETE SET NULL
);

CREATE TABLE teams (
  id VARCHAR(20) PRIMARY KEY,
  group_id VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  lead_id VARCHAR(20) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_id) REFERENCES employees(employee_id) ON DELETE SET NULL
);

CREATE TABLE team_members (
  team_id VARCHAR(20) NOT NULL,
  employee_id VARCHAR(20) NOT NULL,
  PRIMARY KEY (team_id, employee_id),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
);

CREATE TABLE workspace_members (
  workspace_id VARCHAR(20) NOT NULL,
  employee_id VARCHAR(20) NOT NULL,
  user_type_id INT NOT NULL DEFAULT 3,
  group_id VARCHAR(20) NULL,
  team_id VARCHAR(20) NULL,
  PRIMARY KEY (workspace_id, employee_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  FOREIGN KEY (user_type_id) REFERENCES user_types(id),
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);

CREATE TABLE status_columns (
  id VARCHAR(30) PRIMARY KEY,
  workspace_id VARCHAR(20) NOT NULL,
  name VARCHAR(60) NOT NULL,
  kind ENUM('backlog', 'scheduled', 'todo', 'processing', 'review', 'correction', 'completed', 'custom') NOT NULL,
  tone VARCHAR(20) NOT NULL DEFAULT 'slate',
  sort_order INT NOT NULL DEFAULT 0,
  wip_limit INT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  INDEX idx_status_columns_workspace (workspace_id, sort_order)
);

CREATE TABLE clients (
  id VARCHAR(20) PRIMARY KEY,
  workspace_id VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  company VARCHAR(150) NULL,
  tone VARCHAR(20) NOT NULL DEFAULT 'blue',
  contact_name VARCHAR(100) NULL,
  email VARCHAR(150) NULL,
  phone VARCHAR(30) NULL,
  status ENUM('Active', 'On hold', 'Prospect', 'Inactive') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  INDEX idx_clients_workspace (workspace_id)
);

CREATE TABLE tasks (
  id VARCHAR(20) PRIMARY KEY,
  workspace_id VARCHAR(20) NOT NULL,
  group_id VARCHAR(20) NULL,
  team_id VARCHAR(20) NULL,
  client_id VARCHAR(20) NULL,
  status_id VARCHAR(30) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  priority ENUM('Urgent', 'High', 'Normal', 'Low') NOT NULL DEFAULT 'Normal',
  size_key ENUM('XS', 'S', 'M', 'L', 'XL') NOT NULL DEFAULT 'M',
  points INT NOT NULL DEFAULT 5,
  tags JSON NULL,
  created_by_id VARCHAR(20) NULL,
  created_at DATE NOT NULL,
  due_date DATE NULL,
  scheduled_date DATE NULL,
  completed_at DATE NULL,
  completed_by_id VARCHAR(20) NULL,
  comment_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE RESTRICT,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
  FOREIGN KEY (status_id) REFERENCES status_columns(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
  FOREIGN KEY (completed_by_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
  INDEX idx_tasks_workspace_status (workspace_id, status_id),
  INDEX idx_tasks_due (workspace_id, due_date),
  INDEX idx_tasks_scheduled (workspace_id, scheduled_date)
);

CREATE TABLE task_assignees (
  task_id VARCHAR(20) NOT NULL,
  employee_id VARCHAR(20) NOT NULL,
  PRIMARY KEY (task_id, employee_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  INDEX idx_task_assignees_employee (employee_id)
);

CREATE TABLE task_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id VARCHAR(20) NOT NULL,
  workspace_id VARCHAR(20) NOT NULL,
  actor_id VARCHAR(20) NULL,
  action ENUM('created', 'moved', 'updated', 'assigned', 'commented', 'completed', 'deleted') NOT NULL,
  summary VARCHAR(255) NOT NULL,
  detail JSON NULL,
  at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
  INDEX idx_task_history_task (task_id, at)
);

CREATE TABLE automation_rules (
  id VARCHAR(40) PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO automation_rules (id, enabled) VALUES
  ('scheduled-to-todo', TRUE),
  ('overdue-flag', TRUE),
  ('correction-reopen', TRUE),
  ('complete-stamps-date', TRUE);
