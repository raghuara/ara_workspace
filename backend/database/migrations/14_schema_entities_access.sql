ALTER TABLE employees
  ADD COLUMN workspace_id VARCHAR(20) NULL AFTER employee_id,
  ADD INDEX idx_employees_workspace (workspace_id),
  ADD CONSTRAINT fk_employees_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;

ALTER TABLE departments
  DROP INDEX name,
  ADD COLUMN workspace_id VARCHAR(20) NULL AFTER id,
  ADD UNIQUE KEY uq_department_per_workspace (workspace_id, name),
  ADD CONSTRAINT fk_departments_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE designations
  DROP INDEX name,
  ADD COLUMN workspace_id VARCHAR(20) NULL AFTER id,
  ADD UNIQUE KEY uq_designation_per_workspace (workspace_id, name),
  ADD CONSTRAINT fk_designations_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

SET @first_workspace := (SELECT id FROM workspaces ORDER BY created_at, id LIMIT 1);

UPDATE departments SET workspace_id = @first_workspace WHERE workspace_id IS NULL;
UPDATE designations SET workspace_id = @first_workspace WHERE workspace_id IS NULL;
UPDATE employees e
  LEFT JOIN users u ON u.employee_id = e.employee_id AND u.user_type_id = 1
  SET e.workspace_id = @first_workspace
  WHERE e.workspace_id IS NULL AND u.id IS NULL;

CREATE TABLE workspace_access (
  workspace_id VARCHAR(20) NOT NULL,
  employee_id VARCHAR(20) NOT NULL,
  scope_type ENUM('workspace', 'group', 'team') NOT NULL,
  scope_id VARCHAR(20) NOT NULL DEFAULT '',
  level ENUM('view', 'edit') NOT NULL,
  PRIMARY KEY (workspace_id, employee_id, scope_type, scope_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  INDEX idx_access_scope (workspace_id, scope_type, scope_id)
);

INSERT IGNORE INTO workspace_access (workspace_id, employee_id, scope_type, scope_id, level)
SELECT g.workspace_id, tm.employee_id, 'team', t.id, 'edit'
FROM team_members tm
JOIN teams t ON t.id = tm.team_id
JOIN workspace_groups g ON g.id = t.group_id;

INSERT IGNORE INTO workspace_access (workspace_id, employee_id, scope_type, scope_id, level)
SELECT g.workspace_id, t.lead_id, 'team', t.id, 'edit'
FROM teams t
JOIN workspace_groups g ON g.id = t.group_id
WHERE t.lead_id IS NOT NULL;

INSERT IGNORE INTO workspace_access (workspace_id, employee_id, scope_type, scope_id, level)
SELECT g.workspace_id, g.lead_id, 'group', g.id, 'edit'
FROM workspace_groups g
WHERE g.lead_id IS NOT NULL;

ALTER TABLE workspace_members DROP COLUMN task_scope;

UPDATE user_types
SET permissions = JSON_REMOVE(permissions, JSON_UNQUOTE(JSON_SEARCH(permissions, 'one', 'task.view.all')))
WHERE JSON_SEARCH(permissions, 'one', 'task.view.all') IS NOT NULL;
