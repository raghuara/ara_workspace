ALTER TABLE workspaces
  ADD COLUMN fiscal_year_start_month TINYINT UNSIGNED NOT NULL DEFAULT 4 AFTER tone;

UPDATE user_types
SET
  permissions = '["workspace.view","dashboard.view","task.view","task.update","task.move"]',
  permissions_locked = TRUE,
  description = 'Sees and works only the tasks assigned to them. Permissions are fixed.'
WHERE id = 3;
