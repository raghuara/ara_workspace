ALTER TABLE task_history ADD COLUMN task_title VARCHAR(200) NULL AFTER task_id;

UPDATE task_history h
JOIN tasks t ON t.id = h.task_id
SET h.task_title = t.title
WHERE h.task_title IS NULL;
