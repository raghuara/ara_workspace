ALTER TABLE workspace_members
  ADD COLUMN task_scope ENUM('own', 'team') NOT NULL DEFAULT 'team';
