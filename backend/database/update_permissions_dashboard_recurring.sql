UPDATE user_types
SET permissions = JSON_ARRAY_APPEND(permissions, '$', 'dashboard.view', '$', 'task.recurring')
WHERE id IN (1, 2, 4)
  AND NOT JSON_CONTAINS(permissions, '"dashboard.view"');

UPDATE user_types
SET permissions = JSON_ARRAY_APPEND(permissions, '$', 'dashboard.view')
WHERE id = 5
  AND NOT JSON_CONTAINS(permissions, '"dashboard.view"');
