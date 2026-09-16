-- The 5 roles used by the frontend. Ids are fixed because the frontend
-- treats 1, 2 and 3 as the system user types.
INSERT INTO user_types (id, name, slug, description, is_system, permissions_locked, tone, permissions) VALUES
(1, 'Master Admin', 'master-admin', 'Full control across every workspace, including roles and feature access.', TRUE, TRUE, 'violet',
 '["workspace.view","workspace.create","workspace.update","workspace.delete","group.manage","team.manage","status.manage","automation.manage","task.view","task.view.all","task.create","task.update","task.delete","task.assign","task.move","task.weightage.set","client.view","client.create","client.update","client.delete","employee.view","employee.update","usertype.view","usertype.manage","feature.manage","activity.view","report.view","dashboard.view","task.recurring"]'),

(2, 'Admin', 'admin', 'Runs the workspaces assigned to them — groups, teams, tasks and clients.', TRUE, FALSE, 'blue',
 '["workspace.view","workspace.update","group.manage","team.manage","status.manage","automation.manage","task.view","task.view.all","task.create","task.update","task.delete","task.assign","task.move","task.weightage.set","client.view","client.create","client.update","client.delete","employee.view","activity.view","report.view","usertype.view","dashboard.view","task.recurring"]'),

(3, 'Employee', 'employee', 'Works the tasks assigned to them and moves them across the board.', TRUE, FALSE, 'slate',
 '["workspace.view","task.view","task.create","task.update","task.move"]'),

(4, 'Team Lead', 'team-lead', 'Assigns and reviews work inside a single team.', FALSE, FALSE, 'teal',
 '["workspace.view","team.manage","task.view","task.view.all","task.create","task.update","task.assign","task.move","task.weightage.set","client.view","employee.view","report.view","dashboard.view","task.recurring"]'),

(5, 'Client Manager', 'client-manager', 'Owns the client directory and reports, without editing the board.', FALSE, FALSE, 'orange',
 '["workspace.view","task.view","task.view.all","client.view","client.create","client.update","client.delete","employee.view","report.view","activity.view","dashboard.view"]');
