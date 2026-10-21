UPDATE user_types
SET permissions = JSON_ARRAY_APPEND(permissions, '$', 'ticket.manage.all')
WHERE JSON_SEARCH(permissions, 'one', 'ticket.manage.all') IS NULL AND id IN (1, 2);
