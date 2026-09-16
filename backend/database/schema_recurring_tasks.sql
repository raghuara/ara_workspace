CREATE TABLE recurring_tasks (
  id VARCHAR(20) PRIMARY KEY,
  workspace_id VARCHAR(20) NOT NULL,
  group_id VARCHAR(20) NULL,
  team_id VARCHAR(20) NULL,
  client_id VARCHAR(20) NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  priority ENUM('Urgent', 'High', 'Normal', 'Low') NOT NULL DEFAULT 'Normal',
  size_key ENUM('XS', 'S', 'M', 'L', 'XL') NOT NULL DEFAULT 'M',
  points INT NOT NULL DEFAULT 5,
  per_assignee BOOLEAN NOT NULL DEFAULT FALSE,
  frequency ENUM('weekly', 'monthly') NOT NULL DEFAULT 'weekly',
  weekdays JSON NULL,
  month_days JSON NULL,
  due_offset_days INT NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_on DATE NULL,
  created_count INT NOT NULL DEFAULT 0,
  created_by_id VARCHAR(20) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
  INDEX idx_recurring_workspace (workspace_id, is_active)
);

CREATE TABLE recurring_task_assignees (
  rule_id VARCHAR(20) NOT NULL,
  employee_id VARCHAR(20) NOT NULL,
  PRIMARY KEY (rule_id, employee_id),
  FOREIGN KEY (rule_id) REFERENCES recurring_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
);
