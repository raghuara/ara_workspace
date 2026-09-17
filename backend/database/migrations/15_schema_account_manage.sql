-- Logins can now be managed per company: the new account.manage permission
-- decides who may create logins, and the Accounts page is scoped to the
-- caller's workspaces. Admin also gains employee.update so a company admin
-- can onboard their own staff.

UPDATE user_types
SET permissions = JSON_ARRAY_APPEND(permissions, '$', 'account.manage')
WHERE id IN (1, 2) AND JSON_SEARCH(permissions, 'one', 'account.manage') IS NULL;

UPDATE user_types
SET permissions = JSON_ARRAY_APPEND(permissions, '$', 'employee.update')
WHERE id = 2 AND JSON_SEARCH(permissions, 'one', 'employee.update') IS NULL;
