CREATE TABLE task_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id VARCHAR(20) NOT NULL,
  workspace_id VARCHAR(20) NOT NULL,
  author_id VARCHAR(20) NULL,
  author_type_id INT NULL,
  body TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  edited_at DATETIME NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
  FOREIGN KEY (author_type_id) REFERENCES user_types(id) ON DELETE SET NULL,
  INDEX idx_task_comments_task (task_id, created_at)
);

ALTER TABLE tasks
  ADD COLUMN description_updated_at DATETIME NULL AFTER description,
  ADD COLUMN description_updated_by_id VARCHAR(20) NULL AFTER description_updated_at,
  ADD CONSTRAINT fk_tasks_description_updated_by
    FOREIGN KEY (description_updated_by_id) REFERENCES employees(employee_id) ON DELETE SET NULL;

UPDATE tasks SET comment_count = 0 WHERE id <> '';
