UPDATE user_types
SET
  permissions = '["task.view","task.update","task.move"]',
  permissions_locked = FALSE,
  description = 'Works the tasks assigned to them. Only task permissions can be given to this type.'
WHERE id = 3;
