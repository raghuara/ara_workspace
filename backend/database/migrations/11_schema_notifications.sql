CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id VARCHAR(20) NOT NULL,
  kind VARCHAR(30) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body VARCHAR(255) NULL,
  workspace_id VARCHAR(20) NULL,
  task_id VARCHAR(20) NULL,
  actor_id VARCHAR(20) NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
  INDEX idx_notifications_employee (employee_id, is_read, created_at)
);
