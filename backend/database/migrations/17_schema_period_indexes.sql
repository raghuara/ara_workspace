CREATE INDEX idx_tasks_completed ON tasks (workspace_id, completed_at);

CREATE INDEX idx_task_history_workspace_at ON task_history (workspace_id, at);
