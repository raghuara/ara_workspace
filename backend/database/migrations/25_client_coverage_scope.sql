UPDATE user_types
SET permissions = JSON_ARRAY_APPEND(permissions, '$', 'client.coverage.all')
WHERE JSON_SEARCH(permissions, 'one', 'client.coverage.all') IS NULL AND id IN (1, 2);
