# Database setup

Run the files in `migrations/` **in numeric order** on an empty `ara_workspace` database (MySQL 8):

```
01_schema.sql                  employees
02_seed.sql                    three sample employees (optional; skip in production)
03_seed_user_types.sql         the 5 roles and their permissions
04_schema_attachments.sql      uploaded files (blob storage pointers)
05_schema_workspaces.sql       workspaces, groups, teams, columns, clients, tasks, history, automation rules
06_schema_departments.sql      departments (+ seed)
07_schema_features.sql         feature switches (+ seed)
08_schema_recurring_tasks.sql  recurring task rules
09_schema_users_accounts.sql   password-change flag + last login on users
10_schema_member_task_scope.sql  per-member task visibility
11_schema_notifications.sql    in-app notifications
12_schema_designations.sql     designations (+ seed from employees)
13_schema_performance.sql      performance reviews and goals
14_schema_entities_access.sql  workspace = company: employees/catalogs per workspace, workspace_access grants
15_schema_account_manage.sql   account.manage permission; Admin can onboard staff and create logins
16_schema_fiscal_year_employee_scope.sql  per-workspace financial year start month; Employee locked to own tasks
17_schema_period_indexes.sql   indexes for filtering completed tasks and activity by year/month
18_schema_employee_task_permissions.sql  Employee holds task permissions only, editable on User Types
19_schema_task_comments.sql    task comments; who last edited a task description
```

Then create the first login:

```
node database/seed_admin.js
```

Edit the `ADMIN` block in that file first (employee id, email, password). The employee must exist in `employees`.

## Recovery

Lost the last admin password:

```
node database/reset_password.js <login-email> <new-password>
```

## One-off updates already applied to the development database

`update_employee_permissions.sql`, `update_permissions_dashboard_recurring.sql`, `cleanup_hr_modules.sql` — these are folded into `03_seed_user_types.sql` and `07_schema_features.sql`, so a fresh install does not need them.
