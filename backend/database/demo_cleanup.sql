-- Removes everything demo_seed.sql created: the Demo Studio workspace and the EMP-D001..EMP-D030 people.
-- Real employees (EMP-0001, EMP-0002, ...) are never matched.

SET SQL_SAFE_UPDATES = 0;

START TRANSACTION;

DELETE FROM task_history WHERE workspace_id = 'WS-DEMO';
DELETE FROM tasks WHERE workspace_id = 'WS-DEMO';
DELETE FROM client_tickets WHERE workspace_id = 'WS-DEMO';
DELETE FROM recurring_tasks WHERE workspace_id = 'WS-DEMO';
DELETE FROM workspaces WHERE id = 'WS-DEMO';

DELETE FROM attachments WHERE uploaded_by IN (SELECT id FROM (SELECT id FROM users WHERE employee_id LIKE 'EMP-D%') AS demo_users);
DELETE FROM users WHERE employee_id LIKE 'EMP-D%';
DELETE FROM employees WHERE employee_id LIKE 'EMP-D%';

COMMIT;

SET SQL_SAFE_UPDATES = 1;

SELECT
  (SELECT COUNT(*) FROM employees WHERE employee_id LIKE 'EMP-D%') AS demo_employees_left,
  (SELECT COUNT(*) FROM workspaces WHERE id = 'WS-DEMO') AS demo_workspace_left;
